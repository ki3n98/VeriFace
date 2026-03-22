"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface DefaultStartTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (defaultStartTime: string | null) => Promise<void>;
  currentDefaultTime: string | null; // "14:30:00" from API
}

function toApiTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function DefaultStartTimeModal({
  isOpen,
  onClose,
  onSave,
  currentDefaultTime,
}: DefaultStartTimeModalProps) {
  const [timeValue, setTimeValue] = useState("14:30");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentDefaultTime) {
        const parts = currentDefaultTime.split(":");
        setTimeValue(`${parts[0] ?? "14"}:${parts[1] ?? "30"}`);
      } else {
        setTimeValue("14:30");
      }
    }
  }, [isOpen, currentDefaultTime]);

  const handleSave = async () => {
    const [h, m] = timeValue.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;
    setIsSaving(true);
    try {
      await onSave(toApiTime(h, m));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSave(null);
      onClose();
    } finally {
      setIsSaving(false);
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
          <CardTitle>Default session start time</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            New sessions will use this time. Students who check in after it are
            marked late.
          </p>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Time
            </label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isSaving}
              className="text-muted-foreground"
            >
              Clear default
            </Button>
            <div className="flex gap-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
