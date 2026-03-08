"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Camera } from "lucide-react";
import { apiClient } from "@/lib/api";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number | null;
}

type CheckInResult =
  | { kind: "success"; name: string; status: string }
  | { kind: "error"; message: string };

const SCAN_INTERVAL_MS = 2500; // how often to capture a frame
const RESULT_DISPLAY_MS = 2000; // how long to show a result before resuming

export function CheckInModal({ isOpen, onClose, sessionId }: CheckInModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false); // true while a request is in-flight
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [result, setResult] = useState<CheckInResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const captureAndCheckIn = useCallback(async () => {
    if (isScanningRef.current || !videoRef.current || !canvasRef.current || !sessionId) return;

    const video = videoRef.current;
    if (video.readyState < 2) return; // video not ready yet

    isScanningRef.current = true;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        isScanningRef.current = false;
        return;
      }

      const file = new File([blob], "checkin.jpg", { type: "image/jpeg" });
      const response = await apiClient.checkIn(sessionId, file);

      if (!response.error) {
        const results = response.data ?? [];
        const first = results[0];
        if (first?.success) {
          const data = first.data as {
            first_name?: string;
            last_name?: string;
            status?: string;
          } | null;
          const name =
            data?.first_name && data?.last_name
              ? `${data.first_name} ${data.last_name}`
              : "Unknown";
          setResult({ kind: "success", name, status: data?.status ?? "present" });
          // Pause scanning briefly to show the result
          clearInterval(intervalRef.current!);
          setTimeout(() => {
            setResult(null);
            isScanningRef.current = false;
            // Resume scanning
            intervalRef.current = setInterval(captureAndCheckIn, SCAN_INTERVAL_MS);
          }, RESULT_DISPLAY_MS);
          return;
        }
      }

      // No face or no match — fail silently and keep scanning
      isScanningRef.current = false;
    }, "image/jpeg");
  }, [sessionId]);

  // Start camera + scanning loop when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsReady(true);
        intervalRef.current = setInterval(captureAndCheckIn, SCAN_INTERVAL_MS);
      } catch {
        setCameraError("Could not access camera. Please check permissions.");
      }
    }

    startCamera();

    return () => {
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Update the interval callback when sessionId changes
  useEffect(() => {
    if (!isReady) return;
    clearInterval(intervalRef.current!);
    isScanningRef.current = false;
    intervalRef.current = setInterval(captureAndCheckIn, SCAN_INTERVAL_MS);
    return () => clearInterval(intervalRef.current!);
  }, [captureAndCheckIn, isReady]);

  function stopEverything() {
    clearInterval(intervalRef.current!);
    intervalRef.current = null;
    isScanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function handleClose() {
    stopEverything();
    setResult(null);
    setCameraError(null);
    setIsReady(false);
    onClose();
  }

  if (!isOpen || sessionId === null) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Check-In
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          {cameraError ? (
            <div className="w-full h-48 flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm text-center px-4">
              {cameraError}
            </div>
          ) : (
            <div className="relative w-full rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
              />
              {/* Scanning indicator overlay */}
              {isReady && !result && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Scanning…
                </div>
              )}
            </div>
          )}

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Result display */}
          {result && (
            <div
              className={`w-full text-center rounded-lg px-4 py-3 text-sm font-medium ${
                result.kind === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.kind === "success" ? (
                <>
                  ✓ Checked in:{" "}
                  <span className="font-bold">{result.name}</span>
                  {" — "}
                  <span className="capitalize">{result.status}</span>
                </>
              ) : (
                <>✗ {result.message}</>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Point the camera at each student's face. Check-in happens automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
