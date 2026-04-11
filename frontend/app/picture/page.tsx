"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "../sign-in/sign-in.module.css";
import { apiClient } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = "checking" | "intro" | "validating" | "capture" | "uploading" | "polling";

type HasEmbeddingsResponse =
  | { has_embeddings: boolean }
  | { hasEmbeddings: boolean }
  | { ok: boolean }
  | boolean;

// ── Helpers ────────────────────────────────────────────────────────────────────
function coerceHasEmbeddings(data: HasEmbeddingsResponse): boolean {
  if (typeof data === "boolean") return data;
  if (typeof (data as any)?.has_embeddings === "boolean") return (data as any).has_embeddings;
  if (typeof (data as any)?.hasEmbeddings === "boolean") return (data as any).hasEmbeddings;
  if (typeof (data as any)?.ok === "boolean") return (data as any).ok;
  return false;
}

function toErrorString(err: unknown): string {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  const detail = (err as any)?.detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first?.msg) return String(first.msg);
    return JSON.stringify(detail);
  }
  if ((err as any)?.error) return toErrorString((err as any).error);
  if ((err as any)?.message) return String((err as any).message);
  if ((err as any)?.msg) return String((err as any).msg);
  try { return JSON.stringify(err); } catch { return "Something went wrong."; }
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SECTOR_COUNT = 8;
const CANVAS_W = 480;
const CANVAS_H = 480;
const RING_RADIUS = 100;
const DOT_R = 11;
const CLEAN_FRAMES_NEEDED = 45; // ~1.5s at 30fps before capture starts
const SECTOR_ANGLES = Array.from(
  { length: SECTOR_COUNT },
  (_, i) => (i * (Math.PI * 2)) / SECTOR_COUNT - Math.PI / 2
);
const SECTOR_HALF = Math.PI / SECTOR_COUNT;

// ── Component ──────────────────────────────────────────────────────────────────
export default function PicturePage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const handsRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const sectorsDoneRef = useRef<boolean[]>(new Array(SECTOR_COUNT).fill(false));
  const framesRef = useRef<File[]>([]);
  const uploadCalledRef = useRef(false);
  const pendingChecksRef = useRef(0);
  const captureSessionRef = useRef(0);
  const cleanFrameCountRef = useRef(0);
  const phaseRef = useRef<Phase>("checking");

  const [phase, setPhase] = useState<Phase>("checking");
  const [sectorsDone, setSectorsDone] = useState<boolean[]>(new Array(SECTOR_COUNT).fill(false));
  const [cleanProgress, setCleanProgress] = useState(0);
  const [warning, setWarning] = useState("");
  const [occlusionError, setOcclusionError] = useState<string | null>(null);
  const lastWarningTimeRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const showWarning = useCallback((msg: string) => {
    lastWarningTimeRef.current = Date.now();
    setWarning(msg);
  }, []);

  const clearWarning = useCallback(() => {
    if (Date.now() - lastWarningTimeRef.current > 1000) {
      setWarning("");
    }
  }, []);

  // ── Embedding check on mount ──────────────────────────────────────────────────
  async function fetchHasEmbeddings(): Promise<boolean> {
    const res = await apiClient.post<HasEmbeddingsResponse>("/protected/model/hasEmbedding", {});
    return coerceHasEmbeddings((res as any)?.data ?? (res as any));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const has = await fetchHasEmbeddings();
        if (cancelled) return;
        if (has) router.replace("/events");
        else setPhaseSync("intro");
      } catch {
        if (!cancelled) setPhaseSync("intro");
      }
    })();
    return () => { cancelled = true; };
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera helpers ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    faceMeshRef.current = null;
    handsRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: CANVAS_W, height: CANVAS_H, facingMode: "user" },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  // ── Full restart — clears all frames and sectors ──────────────────────────────
  const resetToValidating = useCallback(() => {
    captureSessionRef.current += 1;
    pendingChecksRef.current = 0;
    sectorsDoneRef.current = new Array(SECTOR_COUNT).fill(false);
    framesRef.current = [];
    uploadCalledRef.current = false;
    cleanFrameCountRef.current = 0;
    setSectorsDone(new Array(SECTOR_COUNT).fill(false));
    setCleanProgress(0);
    setPhaseSync("validating");
  }, [setPhaseSync]);

  // ── Pause — face left the circle, keep clean frames and completed sectors ─────
  const pauseCapture = useCallback(() => {
    cleanFrameCountRef.current = 0;
    setCleanProgress(0);
    setPhaseSync("validating");
  }, [setPhaseSync]);

  // ── Capture one frame for a sector ───────────────────────────────────────────
  const captureFrame = useCallback((i: number) => {
    if (sectorsDoneRef.current[i]) return;
    // Mark sector done immediately so the scan always progresses
    sectorsDoneRef.current = sectorsDoneRef.current.map((v, idx) => idx === i ? true : v);
    setSectorsDone([...sectorsDoneRef.current]);

    const video = videoRef.current;
    if (!video) return;

    const tmp = document.createElement("canvas");
    const cropSize = RING_RADIUS * 2;
    const cropX = CANVAS_W / 2 - RING_RADIUS;
    const cropY = CANVAS_H / 2 - RING_RADIUS;
    tmp.width = cropSize;
    tmp.height = cropSize;
    const ctx = tmp.getContext("2d")!;
    ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);

    const session = captureSessionRef.current;
    pendingChecksRef.current += 1;

    tmp.toBlob(async (blob) => {
      if (!blob || session !== captureSessionRef.current) {
        pendingChecksRef.current -= 1;
        return;
      }

      const file = new File([blob], `frame_${i}.jpg`, { type: "image/jpeg" });

      try {
        const result = await apiClient.checkOcclusion(file);
        if (session !== captureSessionRef.current) { pendingChecksRef.current -= 1; return; }
        const data = (result as any)?.data;
        if (data?.enabled && data?.occluded) {
          // Occluded — sector still counted, but frame excluded from upload
          pendingChecksRef.current -= 1;
        } else {
          // Clean frame — include in upload batch
          setOcclusionError(null);
          framesRef.current.push(file);
          pendingChecksRef.current -= 1;
        }
      } catch {
        if (session !== captureSessionRef.current) { pendingChecksRef.current -= 1; return; }
        // Check failed — include frame anyway
        framesRef.current.push(file);
        pendingChecksRef.current -= 1;
      }

      // Once all sectors are done and all checks have settled, decide what to do
      if (
        sectorsDoneRef.current.every((v) => v) &&
        pendingChecksRef.current === 0 &&
        !uploadCalledRef.current
      ) {
        if (framesRef.current.length < 5) {
          setOcclusionError("Too many obstructed frames — please remove face coverings and try again");
          resetToValidating();
        } else {
          uploadCalledRef.current = true;
          doUpload();
        }
      }
    }, "image/jpeg", 0.92);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload all frames ─────────────────────────────────────────────────────────
  const doUpload = useCallback(async () => {
    stopCamera();
    setPhaseSync("uploading");
    setError(null);

    const frames = framesRef.current;

    const res = await apiClient.uploadPictureMulti(frames);
    if ((res as any)?.error) {
      setError(toErrorString((res as any).error));
      setPhaseSync("intro");
      return;
    }

    setPhaseSync("polling");
    const start = Date.now();
    while (Date.now() - start < 60_000) {
      const has = await fetchHasEmbeddings();
      if (has) { router.replace("/events"); return; }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setError("Embedding timed out. Please try again.");
    setPhaseSync("intro");
  }, [stopCamera, router, setPhaseSync]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── MediaPipe result handler ──────────────────────────────────────────────────
  const onResults = useCallback(
    (results: any) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d")!;
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const currentPhase = phaseRef.current;

      // Draw mirrored video
      ctx.save();
      ctx.translate(CANVAS_W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();

      // Brightness check — sample a centre patch to avoid background skew
      const patch = ctx.getImageData(CANVAS_W / 4, CANVAS_H / 4, CANVAS_W / 2, CANVAS_H / 2);
      let luminanceSum = 0;
      for (let p = 0; p < patch.data.length; p += 4) {
        luminanceSum += 0.299 * patch.data[p] + 0.587 * patch.data[p + 1] + 0.114 * patch.data[p + 2];
      }
      const avgLuminance = luminanceSum / (patch.data.length / 4);
      let lightingOk = true;
      if (avgLuminance < 40) {
        showWarning("Too dark — move to a brighter area");
        lightingOk = false;
      } else if (avgLuminance > 220) {
        showWarning("Too bright — avoid direct light behind you");
        lightingOk = false;
      }
      if (!lightingOk) {
        if (currentPhase === "capture") pauseCapture();
        else if (currentPhase === "validating") {
          cleanFrameCountRef.current = 0;
          setCleanProgress(0);
        }
      }

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Guide ring — green when validating and clean, white otherwise
      const ringColor = currentPhase === "validating"
        ? `rgba(34,197,94,${0.3 + cleanFrameCountRef.current / CLEAN_FRAMES_NEEDED * 0.5})`
        : "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(cx, cy, RING_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = currentPhase === "validating" ? 3 : 2;
      ctx.stroke();

      // Sector dots (only shown during capture)
      if (currentPhase === "capture") {
        SECTOR_ANGLES.forEach((angle, i) => {
          const dx = Math.cos(angle) * RING_RADIUS;
          const dy = Math.sin(angle) * RING_RADIUS;
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, DOT_R, 0, Math.PI * 2);
          ctx.fillStyle = sectorsDoneRef.current[i] ? "#22c55e" : "rgba(255,255,255,0.6)";
          ctx.fill();
        });
      }

      const faces = results.multiFaceLandmarks;
      if (!faces || faces.length === 0) return;

      if (faces.length > 1) {
        showWarning("Multiple faces detected — only one person should be in frame");
        resetToValidating();
        return;
      }

      const lm = faces[0];
      const noseX = (1 - lm[1].x) * CANVAS_W;
      const noseY = lm[1].y * CANVAS_H;
      const fdx = noseX - cx;
      const fdy = noseY - cy;
      const dist = Math.sqrt(fdx * fdx + fdy * fdy);

      // Face size check — lm[234] and lm[454] are the outer cheek landmarks
      const faceWidth = Math.abs(lm[454].x - lm[234].x) * CANVAS_W;
      if (faceWidth < 100) {
        showWarning("Get closer to the camera");
        if (currentPhase === "capture") pauseCapture();
        return;
      } else if (faceWidth > 280) {
        showWarning("Too close — move back a little");
        if (currentPhase === "capture") pauseCapture();
        return;
      }

      if (currentPhase === "validating") {
        // Center target circle
        ctx.beginPath();
        ctx.arc(cx, cy, RING_RADIUS * 0.35, 0, Math.PI * 2);
        ctx.strokeStyle = dist < RING_RADIUS * 0.35
          ? "rgba(34,197,94,0.7)"
          : "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Nose dot
        ctx.beginPath();
        ctx.arc(noseX, noseY, 7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(139,92,246,0.9)";
        ctx.fill();

        if (dist > RING_RADIUS * 0.35) {
          cleanFrameCountRef.current = 0;
          setCleanProgress(0);
          showWarning("Center your face in the circle");
          return;
        }

        if (!lightingOk) return;
        clearWarning();
        cleanFrameCountRef.current = Math.min(cleanFrameCountRef.current + 1, CLEAN_FRAMES_NEEDED);
        setCleanProgress(cleanFrameCountRef.current / CLEAN_FRAMES_NEEDED);
        if (cleanFrameCountRef.current >= CLEAN_FRAMES_NEEDED) {
          setPhaseSync("capture");
        }
        return;
      }

      // Capture phase — nose dot
      ctx.beginPath();
      ctx.arc(noseX, noseY, 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(139,92,246,0.9)";
      ctx.fill();

      if (dist > RING_RADIUS * 1.6) {
        showWarning("Move back into the circle");
        pauseCapture();
        return;
      }

      if (dist < RING_RADIUS * 0.45 || dist > RING_RADIUS * 1.45) return;

      const faceAngle = Math.atan2(fdy, fdx);
      SECTOR_ANGLES.forEach((sAngle, i) => {
        if (sectorsDoneRef.current[i]) return;
        let diff = Math.abs(faceAngle - sAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < SECTOR_HALF) captureFrame(i);
      });

      clearWarning();
    },
    [captureFrame, showWarning, clearWarning, resetToValidating, pauseCapture, setPhaseSync]
  );

  // ── Start the full flow ───────────────────────────────────────────────────────
  const startCapture = useCallback(async () => {
    captureSessionRef.current += 1;
    pendingChecksRef.current = 0;
    sectorsDoneRef.current = new Array(SECTOR_COUNT).fill(false);
    framesRef.current = [];
    uploadCalledRef.current = false;
    cleanFrameCountRef.current = 0;
    setSectorsDone(new Array(SECTOR_COUNT).fill(false));
    setCleanProgress(0);
    setWarning("");
    setError(null);
    setOcclusionError(null);
    setPhaseSync("validating");

    await startCamera();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — no type declarations for this package
    const { FaceMesh } = await import("@mediapipe/face_mesh");
    const faceMesh = new FaceMesh({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 4,
      refineLandmarks: false,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });
    faceMesh.onResults(onResults);
    await faceMesh.initialize();
    faceMeshRef.current = faceMesh;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { Hands } = await import("@mediapipe/hands");
    const hands = new Hands({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });
    hands.onResults((results: any) => {
      if (!results.multiHandLandmarks?.length) return;
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const inCircle = results.multiHandLandmarks.some((handLandmarks: any[]) =>
        handLandmarks.some((lm: any) => {
          const x = (1 - lm.x) * CANVAS_W;
          const y = lm.y * CANVAS_H;
          const dx = x - cx;
          const dy = y - cy;
          return Math.sqrt(dx * dx + dy * dy) < RING_RADIUS;
        })
      );
      if (inCircle) showWarning("Move your hands out of frame");
    });
    await hands.initialize();
    handsRef.current = hands;

    const video = videoRef.current!;
    const sendFrame = async () => {
      if (video.readyState >= 2) {
        const sends: Promise<void>[] = [];
        if (faceMeshRef.current) sends.push(faceMeshRef.current.send({ image: video }));
        if (handsRef.current) sends.push(handsRef.current.send({ image: video }));
        await Promise.all(sends);
      }
      rafRef.current = requestAnimationFrame(sendFrame);
    };
    rafRef.current = requestAnimationFrame(sendFrame);
  }, [startCamera, onResults, setPhaseSync]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Render ────────────────────────────────────────────────────────────────────
  const doneCount = sectorsDone.filter(Boolean).length;

  if (phase === "checking") {
    return (
      <div className={styles.pageWrapper}>
        <img src="/logo.png" className={styles.logo} alt="Logo" />
        <div className={styles.card} style={{ textAlign: "center", padding: 32 }}>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (phase === "uploading" || phase === "polling") {
    return (
      <div className={styles.pageWrapper}>
        <img src="/logo.png" className={styles.logo} alt="Logo" />
        <div className={styles.card} style={{ textAlign: "center", padding: 32 }}>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
            {phase === "uploading" ? "Uploading…" : "Loading…"}
          </p>
          <div
            style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "4px solid #e5e5e5", borderTopColor: "#8b5cf6",
              margin: "0 auto", animation: "spin 0.9s linear infinite",
            }}
          />
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className={styles.pageWrapper}>
        <img src="/logo.png" className={styles.logo} alt="Logo" />
        <div className={styles.card} style={{ maxWidth: 480, margin: "24px auto" }}>
          <h1 className={styles.title}>Face Setup</h1>
          <p style={{ color: "#555", marginBottom: 16 }}>
            We'll guide you to slowly move your face in a circle so we can
            capture multiple angles for a robust face embedding.
          </p>
          <ul style={{ color: "#444", fontSize: 14, marginBottom: 24, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>Remove sunglasses or tinted lenses</li>
            <li>Remove hats, hoods, or anything covering your forehead</li>
            <li>Make sure your face is well lit</li>
            <li>Keep only one person in frame</li>
          </ul>
          {error && <p className={styles.error} style={{ marginBottom: 12 }}>{error}</p>}
          <button className={styles.button} onClick={startCapture}>
            Start Face Setup
          </button>
        </div>
      </div>
    );
  }

  // ── Validating + Capture phases (shared canvas UI) ────────────────────────────
  const isValidating = phase === "validating";

  return (
    <div className={styles.pageWrapper}>
      <img src="/logo.png" className={styles.logo} alt="Logo" />
      <div className={styles.card} style={{ maxWidth: 540, margin: "24px auto", padding: "20px 24px" }}>
        <h1 className={styles.title} style={{ marginBottom: 4 }}>
          {isValidating ? "Face Setup" : "Move your face in a circle"}
        </h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 10 }}>
          {isValidating
            ? "Hold still and look at the camera…"
            : doneCount < SECTOR_COUNT
              ? `${doneCount} / ${SECTOR_COUNT}`
              : "Uploading…"}
        </p>

        {/* Progress bar */}
        <div style={{ height: 6, background: "#eee", borderRadius: 4, marginBottom: 12 }}>
          <div
            style={{
              height: "100%",
              width: isValidating
                ? `${cleanProgress * 100}%`
                : `${(doneCount / SECTOR_COUNT) * 100}%`,
              background: isValidating ? "#22c55e" : "#8b5cf6",
              borderRadius: 4,
              transition: "width 0.1s",
            }}
          />
        </div>

        {/* Warning banner */}
        {warning && (
          <div
            style={{
              background: "#fef3c7", border: "1px solid #fbbf24",
              borderRadius: 8, padding: "8px 12px", marginBottom: 12,
              fontSize: 13, color: "#92400e",
            }}
          >
            ⚠ {warning}
          </div>
        )}

        {/* Occlusion error banner */}
        {occlusionError && (
          <div
            style={{
              background: "#fdecea", border: "1px solid #f5c6cb",
              borderRadius: 8, padding: "8px 12px", marginBottom: 12,
              fontSize: 13, color: "#d93025",
            }}
          >
            ✕ {occlusionError}
          </div>
        )}

        {/* Webcam canvas */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <video ref={videoRef} style={{ display: "none" }} playsInline muted />
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ borderRadius: 16, maxWidth: "100%", background: "#111", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}
