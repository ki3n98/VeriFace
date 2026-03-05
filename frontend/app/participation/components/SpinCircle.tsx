"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// 5-color palette: Indigo, Teal, Emerald, Amber, Rose
// Base colors with light (+10%) and dark (-10%) variants
const BASE_PALETTE = [
  { base: "#4F46E5", light: "#6366F1", dark: "#4338CA" }, // Indigo
  { base: "#0D9488", light: "#14B8A6", dark: "#0F766E" }, // Teal
  { base: "#059669", light: "#10B981", dark: "#047857" }, // Emerald
  { base: "#D97706", light: "#F59E0B", dark: "#B45309" }, // Amber
  { base: "#E11D48", light: "#F43F5E", dark: "#BE123C" }, // Rose
];

// Cycle through 5 families so no two adjacent segments share the same base color
function getSegmentColor(index: number): string {
  const family = index % BASE_PALETTE.length;
  const variantIndex = Math.floor(index / BASE_PALETTE.length) % 3;
  const palette = BASE_PALETTE[family];
  const variants = [palette.base, palette.light, palette.dark];
  return variants[variantIndex];
}

interface EventMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status?: "present" | "late";
}

interface SpinCircleProps {
  members: EventMember[];
  onWinner: (member: EventMember) => void;
  disabled?: boolean;
  calledIds?: Set<number>;
}

export function SpinCircle({
  members,
  onWinner,
  disabled = false,
  calledIds = new Set(),
}: SpinCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [landedPause, setLandedPause] = useState(false);
  const animationRef = useRef<number>(0);
  const idleRef = useRef<number>(0);
  const angleRef = useRef(0);
  const idleAngleRef = useRef(0);
  const angleDeltaRef = useRef(0);
  const spinStartRef = useRef(0);
  const winnerPickedRef = useRef(false);

  // ~50% larger than original 290: 290 * 1.5 ≈ 435
  const size = 435;
  const outlineWidth = 10;
  const dimension = (size + 20) * 2;
  const centerX = size + 20;
  const centerY = size + 20;
  const upDuration = 40;
  const downDuration = 350;

  const segments = members.map((m) => ({
    label: `${m.first_name} ${m.last_name}`,
    id: m.id,
    status: m.status,
  }));
  const segColors = members.map((_, i) => getSegmentColor(i));

  const drawSegment = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      key: number,
      lastAngle: number,
      angle: number
    ) => {
      const seg = segments[key];
      const isCalled = calledIds.has(seg.id);
      const color = segColors[key % segColors.length];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, size, lastAngle, angle, false);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();
      ctx.fillStyle = isCalled ? color + "60" : color;
      ctx.fill();
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((lastAngle + angle) / 2);
      ctx.fillStyle = "white";
      ctx.font = "bold 0.95em Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      const label =
        seg.label.length > 16 ? seg.label.substring(0, 16) + "…" : seg.label;
      ctx.fillText(label, size / 2 + 30, 0);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.restore();
      if (seg.status) {
        ctx.save();
        const midAngle = (lastAngle + angle) / 2;
        const dotRadius = 12;
        const dotDist = size - 35;
        const dotX = centerX + Math.cos(midAngle) * dotDist;
        const dotY = centerY + Math.sin(midAngle) * dotDist;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fillStyle = seg.status === "present" ? "#22C55E" : "#EAB308";
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    },
    [segments, segColors, calledIds]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const angleCurrent = angleRef.current;
    const PI2 = Math.PI * 2;

    ctx.clearRect(0, 0, dimension, dimension);

    let lastAngle = angleCurrent;
    for (let i = 1; i <= segments.length; i++) {
      const angle = PI2 * (i / segments.length) + angleCurrent;
      drawSegment(ctx, i - 1, lastAngle, angle);
      lastAngle = angle;
    }

    const gradient = ctx.createRadialGradient(
      centerX - 18,
      centerY - 18,
      0,
      centerX,
      centerY,
      65
    );
    gradient.addColorStop(0, "#8B5CF6");
    gradient.addColorStop(0.5, "#7C3AED");
    gradient.addColorStop(1, "#6D28D9");
    ctx.beginPath();
    ctx.arc(centerX, centerY, 65, 0, PI2, false);
    ctx.closePath();
    ctx.shadowColor = "rgba(124, 58, 237, 0.35)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "bold 1.1em Inter, system-ui, sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Spin", centerX, centerY + 3);

    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, PI2, false);
    ctx.closePath();
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = "#1f2937";
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(centerX + 26, centerY - 65);
    ctx.lineTo(centerX - 26, centerY - 65);
    ctx.lineTo(centerX, centerY - 95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, [segments.length, drawSegment]);

  const onTimerTick = useCallback(() => {
    const duration = Date.now() - spinStartRef.current;
    const upTime = segments.length * upDuration;
    const downTime = segments.length * downDuration;
    const maxSpeed = Math.PI / segments.length;

    let progress = 0;
    let finished = false;

    if (duration < upTime) {
      progress = duration / upTime;
      angleDeltaRef.current = maxSpeed * Math.sin((progress * Math.PI) / 2);
    } else {
      progress = (duration - upTime) / downTime;
      angleDeltaRef.current =
        maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
      if (progress >= 1) finished = true;
    }

    angleRef.current += angleDeltaRef.current;
    while (angleRef.current >= Math.PI * 2) angleRef.current -= Math.PI * 2;

    draw();

    if (finished && !winnerPickedRef.current) {
      winnerPickedRef.current = true;
      const change = angleRef.current + Math.PI / 2;
      let i =
        segments.length -
        Math.floor((change / (Math.PI * 2)) * segments.length) -
        1;
      if (i < 0) i = i + segments.length;
      const winner = members[i];
      if (winner) {
        setSpinning(false);
        setLandedPause(true);
        onWinner(winner);
      }
      return;
    }

    if (!finished) {
      animationRef.current = requestAnimationFrame(onTimerTick);
    }
  }, [segments, members, draw, onWinner]);

  const spin = useCallback(() => {
    if (members.length === 0 || disabled || spinning) return;
    if (idleRef.current) cancelAnimationFrame(idleRef.current);
    setLandedPause(false);
    setSpinning(true);
    winnerPickedRef.current = false;
    spinStartRef.current = Date.now();
    angleDeltaRef.current = Math.PI / segments.length;
    animationRef.current = requestAnimationFrame(onTimerTick);
  }, [members.length, disabled, spinning, segments.length, onTimerTick]);

  useEffect(() => {
    draw();
  }, [draw, members, calledIds]);

  // 1s pause after landing before idle resumes
  useEffect(() => {
    if (!landedPause) return;
    const timer = setTimeout(() => setLandedPause(false), 1000);
    return () => clearTimeout(timer);
  }, [landedPause]);

  useEffect(() => {
    if (spinning || landedPause || members.length === 0) return;
    idleAngleRef.current = angleRef.current;
    const idleSpin = () => {
      idleAngleRef.current = (idleAngleRef.current + 0.002) % (Math.PI * 2);
      angleRef.current = idleAngleRef.current;
      draw();
      idleRef.current = requestAnimationFrame(idleSpin);
    };
    idleRef.current = requestAnimationFrame(idleSpin);
    return () => {
      if (idleRef.current) cancelAnimationFrame(idleRef.current);
    };
  }, [spinning, landedPause, members.length, draw]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (idleRef.current) cancelAnimationFrame(idleRef.current);
    };
  }, []);

  const handleCanvasClick = useCallback(() => {
    spin();
  }, [spin]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        spin();
      }
    },
    [spin]
  );

  if (members.length === 0) return null;

  return (
    <div className="relative flex flex-col items-center w-full">
      <div className="relative inline-block w-full max-w-full">
        <canvas
          ref={canvasRef}
          width={dimension}
          height={dimension}
          className="block w-full h-auto max-w-full"
          style={{ aspectRatio: "1" }}
          aria-hidden="true"
        />
        {/* Accessible spin button overlay - circular, focusable */}
        <button
          type="button"
          className={`spin-btn absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[130px] h-[130px] rounded-full bg-transparent cursor-pointer flex items-center justify-center focus:outline-none ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          onClick={handleCanvasClick}
          onKeyDown={handleKeyDown}
          disabled={disabled || spinning}
          aria-label="Spin the wheel to select a student"
        >
          <span className="sr-only">Spin</span>
        </button>
      </div>
      {spinning && (
        <p
          className="mt-3 text-[14px] text-muted-foreground"
          aria-live="polite"
          role="status"
        >
          Spinning...
        </p>
      )}
    </div>
  );
}
