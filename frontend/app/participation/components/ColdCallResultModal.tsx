"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UserMinus, RotateCcw } from "lucide-react";

interface EventMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface ColdCallResultModalProps {
  isOpen: boolean;
  member: EventMember | null;
  onRemoveFromPool: () => void;
  onContinue: () => void;
}

export function ColdCallResultModal({
  isOpen,
  member,
  onRemoveFromPool,
  onContinue,
}: ColdCallResultModalProps) {
  if (!isOpen) return null;

  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : "";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onContinue()}
    >
      <Card className="w-full max-w-md border-2 border-primary/30 bg-card text-card-foreground">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <span className="text-3xl">🎉</span>
          </div>
          <h3 className="text-xl font-bold text-card-foreground">
            {displayName}
          </h3>
          <p className="text-sm text-card-foreground/80">
            was selected for cold calling
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4">
          <Button
            variant="outline"
            className="w-full border-2 border-card-foreground/50 text-card-foreground hover:bg-card-foreground/10"
            onClick={onContinue}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Continue (keep in pool)
          </Button>
          <Button
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={onRemoveFromPool}
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Remove from cold call pool
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
