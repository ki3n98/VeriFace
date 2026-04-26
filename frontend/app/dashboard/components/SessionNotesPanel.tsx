"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { apiClient } from "@/lib/api";

interface SessionNotesPanelProps {
  sessionId: number;
  initialNotes: string | null;
  canEdit: boolean;
  onSaved: (notes: string) => void;
}

export function SessionNotesPanel({
  sessionId,
  initialNotes,
  canEdit,
  onSaved,
}: SessionNotesPanelProps) {
  const [value, setValue] = useState<string>(initialNotes ?? "");
  const [expanded, setExpanded] = useState<boolean>(
    canEdit || !!(initialNotes && initialNotes.trim().length > 0),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setValue(initialNotes ?? "");
    setError(null);
    setJustSaved(false);
  }, [sessionId, initialNotes]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const dirty = value !== (initialNotes ?? "");

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setJustSaved(false);
    const res = await apiClient.updateSessionNotes(sessionId, value);
    setIsSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSaved(value);
    setJustSaved(true);
  };

  return (
    <Card className="mb-4">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-3 cursor-pointer"
        onClick={() => setExpanded((x) => !x)}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Session Notes
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
          aria-label={expanded ? "Collapse notes" : "Expand notes"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {canEdit ? (
            <>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Add notes for this session — observations, follow-ups, context..."
                rows={4}
                className="w-full px-3 py-2 border rounded-md text-sm bg-card text-card-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                disabled={isSaving}
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                {justSaved && (
                  <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setValue(initialNotes ?? "")}
                  disabled={!dirty || isSaving}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={!dirty || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm whitespace-pre-wrap text-foreground2">
              {value && value.trim().length > 0 ? (
                value
              ) : (
                <span className="text-muted-foreground italic">
                  No notes for this session yet.
                </span>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
