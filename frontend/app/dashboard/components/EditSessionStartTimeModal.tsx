"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface EditSessionStartTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startTime: string | null) => void;
  isSaving: boolean;
  sessionNumber: number;
  currentStartTime: string | null;
}

function formatForInput(iso: string | null): { date: string; time: string } {
  if (!iso) {
    const t = new Date();
    return {
      date: t.toISOString().slice(0, 10),
      time: "14:30",
    };
  }
  try {
    const d = new Date(iso);
    return {
      date: d.toISOString().slice(0, 10),
      time: d.toTimeString().slice(0, 5),
    };
  } catch {
    const t = new Date();
    return {
      date: t.toISOString().slice(0, 10),
      time: "14:30",
    };
  }
}

export function EditSessionStartTimeModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  sessionNumber,
  currentStartTime,
}: EditSessionStartTimeModalProps) {
  const parsed = formatForInput(currentStartTime);
  const [startDate, setStartDate] = useState(parsed.date);
  const [startTime, setStartTime] = useState(parsed.time);
  const [useStartTime, setUseStartTime] = useState(!!currentStartTime);

  useEffect(() => {
    const p = formatForInput(currentStartTime);
    setStartDate(p.date);
    setStartTime(p.time);
    setUseStartTime(!!currentStartTime);
  }, [isOpen, currentStartTime]);

  const handleSave = () => {
    if (useStartTime) {
      onSave(`${startDate}T${startTime}:00`);
    } else {
      onSave(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Session {sessionNumber} Start Time</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Students who check in after this time will be marked as late.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useStartTime}
              onChange={(e) => setUseStartTime(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Set session start time</span>
          </label>
          {useStartTime && (
            <div className="flex gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
