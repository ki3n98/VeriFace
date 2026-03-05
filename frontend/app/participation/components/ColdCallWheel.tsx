"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { ColdCallResultModal } from "@/app/participation/components/ColdCallResultModal";
import { SpinCircle } from "@/app/participation/components/SpinCircle";

interface EventMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status?: "present" | "late";
}

interface ColdCallWheelProps {
  members: EventMember[];
  loading: boolean;
  eventName?: string;
  sessionLabel?: string | null;
}

export function ColdCallWheel({
  members,
  loading,
  eventName,
  sessionLabel,
}: ColdCallWheelProps) {
  const [pool, setPool] = useState<EventMember[]>([]);
  const [calledIds, setCalledIds] = useState<Set<number>>(new Set());
  const [selectedMember, setSelectedMember] = useState<EventMember | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerConfetti = useCallback(() => {
    const duration = 2 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#8B5CF6", "#22C55E", "#E8B923", "#3B82F6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#8B5CF6", "#22C55E", "#E8B923", "#3B82F6"],
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const POPUP_DELAY_MS = 1500;

  const handleWinner = useCallback(
    (winner: EventMember) => {
      setSelectedMember(winner);
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      popupTimerRef.current = setTimeout(() => {
        triggerConfetti();
        setIsModalOpen(true);
        popupTimerRef.current = null;
      }, POPUP_DELAY_MS);
    },
    [triggerConfetti]
  );

  useEffect(() => () => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
  }, []);

  const handleRemoveFromPool = useCallback(() => {
    if (selectedMember) {
      setPool((prev) => prev.filter((m) => m.id !== selectedMember.id));
      setSelectedMember(null);
      setIsModalOpen(false);
    }
  }, [selectedMember]);

  const handleContinue = useCallback(() => {
    if (selectedMember) {
      setCalledIds((prev) => new Set(prev).add(selectedMember.id));
    }
    setSelectedMember(null);
    setIsModalOpen(false);
  }, [selectedMember]);

  // Sync pool when members change (event switch or initial load)
  useEffect(() => {
    setPool(members.length > 0 ? [...members] : []);
    setCalledIds(new Set());
  }, [members]);

  const handleResetPool = useCallback(() => {
    setPool([...members]);
    setCalledIds(new Set());
  }, [members]);

  const displayPool = pool;

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-16 text-[14px]">
        Loading members...
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 text-[14px]">
        No one present or late in the latest session yet. Start a session and
        have students check in to use the cold calling wheel.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Wheel container: clamp(360px, 48vw, 720px), centered */}
      <div className="w-full pt-4 flex flex-col items-center">
        {/* Wheel container: clamp(360px, 48vw, 720px) */}
        <div
          className="relative wheel-wrapper"
          style={{ width: "clamp(360px, 48vw, 720px)" }}
        >
          <div className="wheel-card wheel relative rounded-full aspect-square w-full">
            <SpinCircle
              members={displayPool}
              onWinner={handleWinner}
              disabled={displayPool.length === 0}
              calledIds={calledIds}
            />
          </div>
        </div>

        {/* Footer: members count directly under wheel, subtle legend */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-[14px] text-muted-foreground">
            {displayPool.length} member{displayPool.length !== 1 ? "s" : ""} in the pool
          </p>
          <div className="flex items-center gap-4 text-[13px] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Tardy
            </span>
          </div>
          {displayPool.length === 0 && members.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPool}
              className="border-primary/40 text-primary hover:bg-primary/5 text-[13px] mt-1"
            >
              Reset pool
            </Button>
          )}
        </div>
      </div>

      {/* Placeholder for Breakout Groups (future implementation) */}
      <div className="w-full max-w-[1100px] mx-auto mt-10 min-h-[120px]" />

      {/* Screen reader announcement for spin result */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {selectedMember
          ? `${selectedMember.first_name} ${selectedMember.last_name} was selected`
          : ""}
      </div>

      <ColdCallResultModal
        isOpen={isModalOpen}
        member={selectedMember}
        onRemoveFromPool={handleRemoveFromPool}
        onContinue={handleContinue}
      />
    </div>
  );
}
