"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (startTime: string | null) => void;
  isCreating: boolean;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}: CreateSessionModalProps) {
  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);
  const defaultTime = "14:30";
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultTime);
  const [useStartTime, setUseStartTime] = useState(false);

  const handleCreate = () => {
    if (useStartTime) {
      const iso = `${startDate}T${startTime}:00`;
      onCreate(iso);
    } else {
      onCreate(null);
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
          <CardTitle>Create New Session</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Optionally set a session start time. Students who check in after this
            time will be marked as late.
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
                <label className="block text-xs text-muted-foreground mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Time (e.g. 2:30 PM)
                </label>
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
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-primary hover:bg-primary/90"
            >
              {isCreating ? "Creating..." : "Create Session"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
