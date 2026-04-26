"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
  | { kind: "success"; name: string; status: string; alreadyCheckedIn: boolean }
  | { kind: "error"; message: string };

type LivenessAction = "blink" | "double_blink";

interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

interface FaceMeshResults {
  multiFaceLandmarks?: FaceLandmark[][];
}

interface FaceMeshInstance {
  setOptions: (options: {
    maxNumFaces: number;
    refineLandmarks: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }) => void;
  onResults: (callback: (results: FaceMeshResults) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
}

const SCAN_INTERVAL_MS = 2500;
const RESULT_DISPLAY_MS = 2000;
const LIVENESS_TIMEOUT_MS = 7000;
const LIVENESS_FRAME_INTERVAL_MS = 70;

let faceMeshPromise: Promise<FaceMeshInstance> | null = null;

export function CheckInModal({ isOpen, onClose, sessionId }: CheckInModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [result, setResult] = useState<CheckInResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [challengePrompt, setChallengePrompt] = useState<string | null>(null);
  const [livenessStatus, setLivenessStatus] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const resumeScanningAfterResult = useCallback(() => {
    setTimeout(() => {
      setResult(null);
      setChallengePrompt(null);
      setLivenessStatus(null);
      isScanningRef.current = false;
    }, RESULT_DISPLAY_MS);
  }, []);

  const captureAndCheckIn = useCallback(async () => {
    if (isScanningRef.current || !videoRef.current || !canvasRef.current || !sessionId) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    isScanningRef.current = true;
    setResult(null);
    setChallengePrompt(null);
    setLivenessStatus("Preparing live face check...");

    const challengeResponse = await apiClient.startCheckInChallenge(sessionId);
    if (challengeResponse.error || !challengeResponse.data) {
      setResult({
        kind: "error",
        message: challengeResponse.error || "Could not start live face check.",
      });
      resumeScanningAfterResult();
      return;
    }

    const challenge = challengeResponse.data;
    setChallengePrompt(challenge.prompt);
    setLivenessStatus("Follow the prompt while looking at the camera.");

    const isLive = await runLivenessChallenge(
      video,
      challenge.action,
      setLivenessStatus,
    );

    if (!isLive) {
      setResult({
        kind: "error",
        message: "Live face check failed. Please try again.",
      });
      resumeScanningAfterResult();
      return;
    }

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
      const response = await apiClient.checkIn(sessionId, file, {
        token: challenge.token,
        action: challenge.action,
      });

      if (!response.error) {
        const responseData = response.data as {
          result?: Record<string, { success: boolean; data?: unknown }>;
        } | null;
        const first = responseData?.result?.["0"];
        if (first?.success) {
          const data = first.data as {
            first_name?: string;
            last_name?: string;
            status?: string;
            already_checked_in?: boolean;
          } | null;
          const name =
            data?.first_name && data?.last_name
              ? `${data.first_name} ${data.last_name}`
              : "Unknown";
          setResult({
            kind: "success",
            name,
            status: data?.status ?? "present",
            alreadyCheckedIn: data?.already_checked_in ?? false,
          });
          clearInterval(intervalRef.current!);
          setTimeout(() => {
            setResult(null);
            setChallengePrompt(null);
            setLivenessStatus(null);
            isScanningRef.current = false;
            intervalRef.current = setInterval(captureAndCheckIn, SCAN_INTERVAL_MS);
          }, RESULT_DISPLAY_MS);
          return;
        }
      }

      setChallengePrompt(null);
      setLivenessStatus(null);
      isScanningRef.current = false;
    }, "image/jpeg");
  }, [resumeScanningAfterResult, sessionId]);

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
    setChallengePrompt(null);
    setLivenessStatus(null);
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
              {isReady && !result && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  {challengePrompt ? `Live check: ${challengePrompt}` : "Scanning..."}
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {livenessStatus && !result && (
            <div className="w-full rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-primary">
              {livenessStatus}
            </div>
          )}

          {result && (
            <div
              className={`w-full text-center rounded-lg px-4 py-3 text-sm font-medium ${
                result.kind === "success" && result.alreadyCheckedIn
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : result.kind === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.kind === "success" ? (
                result.alreadyCheckedIn ? (
                  <>
                    Already checked in:{" "}
                    <span className="font-bold">{result.name}</span>
                  </>
                ) : (
                  <>
                    Checked in: <span className="font-bold">{result.name}</span>
                    {" - "}
                    <span className="capitalize">{result.status}</span>
                  </>
                )
              ) : (
                <>{result.message}</>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Point the camera at each student&apos;s face and follow the live prompt before check-in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function createFaceMesh(): Promise<FaceMeshInstance> {
  if (faceMeshPromise) {
    return faceMeshPromise;
  }

  const faceMeshModule = (await import("@mediapipe/face_mesh")) as {
    FaceMesh: new (options: {
      locateFile: (file: string) => string;
    }) => FaceMeshInstance;
  };
  const faceMesh = new faceMeshModule.FaceMesh({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
  });
  faceMesh.setOptions({
    maxNumFaces: 2,
    refineLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });
  faceMeshPromise = faceMesh.initialize().then(() => faceMesh);
  return faceMeshPromise;
}

async function runLivenessChallenge(
  video: HTMLVideoElement,
  action: LivenessAction,
  setStatus: Dispatch<SetStateAction<string | null>>,
): Promise<boolean> {
  const faceMesh = await createFaceMesh();
  const latestResultsRef: { current: FaceMeshResults | null } = { current: null };
  faceMesh.onResults((results) => {
    latestResultsRef.current = results;
  });
  const requiredBlinks = action === "double_blink" ? 2 : 1;
  let openEar = 0;
  let closedFrames = 0;
  let eyeWasClosed = false;
  let blinks = 0;
  let faceFrames = 0;
  const startedAt = Date.now();

  while (Date.now() - startedAt < LIVENESS_TIMEOUT_MS) {
    await faceMesh.send({ image: video });
    const faces = latestResultsRef.current?.multiFaceLandmarks ?? [];

    if (faces.length !== 1) {
      setStatus(faces.length > 1 ? "Only one face should be in frame." : "Looking for one face...");
      await sleep(LIVENESS_FRAME_INTERVAL_MS);
      continue;
    }

    const ear = getEyeAspectRatio(faces[0]);
    if (ear === null) {
      setStatus("Keep your eyes visible to the camera.");
      await sleep(LIVENESS_FRAME_INTERVAL_MS);
      continue;
    }

    faceFrames += 1;
    openEar = Math.max(openEar, ear);

    if (faceFrames < 5) {
      setStatus("Hold still for a moment...");
      await sleep(LIVENESS_FRAME_INTERVAL_MS);
      continue;
    }

    const closedThreshold = openEar * 0.72;
    const openThreshold = openEar * 0.88;

    if (ear < closedThreshold) {
      closedFrames += 1;
      if (closedFrames >= 1) {
        eyeWasClosed = true;
      }
    } else if (eyeWasClosed && ear > openThreshold) {
      blinks += 1;
      eyeWasClosed = false;
      closedFrames = 0;
      setStatus(
        blinks >= requiredBlinks
          ? "Live face check passed."
          : `${blinks}/${requiredBlinks} blinks detected.`,
      );
    } else if (ear > openThreshold) {
      closedFrames = 0;
    }

    if (blinks >= requiredBlinks) {
      return true;
    }

    setStatus(requiredBlinks === 1 ? "Blink once now." : `Blink twice now. ${blinks}/2 detected.`);
    await sleep(LIVENESS_FRAME_INTERVAL_MS);
  }

  return false;
}

function getEyeAspectRatio(landmarks: FaceLandmark[]): number | null {
  const left = getSingleEyeAspectRatio(landmarks, 33, 133, 159, 145);
  const right = getSingleEyeAspectRatio(landmarks, 362, 263, 386, 374);
  if (left === null || right === null) return null;
  return (left + right) / 2;
}

function getSingleEyeAspectRatio(
  landmarks: FaceLandmark[],
  outer: number,
  inner: number,
  top: number,
  bottom: number,
): number | null {
  const points = [landmarks[outer], landmarks[inner], landmarks[top], landmarks[bottom]];
  if (points.some((point) => !point)) return null;

  const horizontal = distance(landmarks[outer], landmarks[inner]);
  const vertical = distance(landmarks[top], landmarks[bottom]);
  if (horizontal === 0) return null;
  return vertical / horizontal;
}

function distance(a: FaceLandmark, b: FaceLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
