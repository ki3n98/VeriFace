"use client";

import { useState, type ReactNode } from "react";
import { Download, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AttendanceReportExportRequest } from "@/lib/api";

export type ReportExportOptions = Omit<AttendanceReportExportRequest, "event_id">;

interface ExportModalProps {
  onClose: () => void;
  onExport: (options: ReportExportOptions) => void;
  isExporting?: boolean;
}

const STATUS_OPTIONS: Array<{
  value: "present" | "late" | "absent";
  label: string;
  className: string;
}> = [
  { value: "present", label: "Present", className: "bg-emerald-500" },
  { value: "late", label: "Late", className: "bg-amber-500" },
  { value: "absent", label: "Absent", className: "bg-red-500" },
];

const AGGREGATION_OPTIONS: Array<{
  value: "overall" | "sessions" | "members" | "matrix";
  label: string;
}> = [
  { value: "overall", label: "Overall totals" },
  { value: "sessions", label: "Session breakdown" },
  { value: "members", label: "Member summary" },
  { value: "matrix", label: "Attendance matrix" },
];

export default function ExportModal({
  onClose,
  onExport,
  isExporting = false,
}: ExportModalProps) {
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [sessionScope, setSessionScope] = useState<"all" | "latest">("all");
  const [statuses, setStatuses] = useState<Array<"present" | "late" | "absent">>([
    "present",
    "late",
    "absent",
  ]);
  const [aggregations, setAggregations] = useState<
    Array<"overall" | "sessions" | "members" | "matrix">
  >(["overall", "sessions", "members", "matrix"]);
  const [includeAllMembers, setIncludeAllMembers] = useState(true);

  const submit = (override?: Partial<ReportExportOptions>) => {
    onExport({
      format,
      session_scope: sessionScope,
      statuses,
      aggregations,
      include_all_members: includeAllMembers,
      ...override,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isExporting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card text-card-foreground shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">Export Report</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the report query and export format.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isExporting}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <section>
            <div className="mb-2 text-sm font-medium">Format</div>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton active={format === "pdf"} onClick={() => setFormat("pdf")}>
                <FileText className="h-4 w-4" />
                Styled PDF
              </ChoiceButton>
              <ChoiceButton active={format === "csv"} onClick={() => setFormat("csv")}>
                <Download className="h-4 w-4" />
                CSV
              </ChoiceButton>
            </div>
          </section>

          <section>
            <div className="mb-2 text-sm font-medium">Session Query</div>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton
                active={sessionScope === "all"}
                onClick={() => setSessionScope("all")}
              >
                All sessions
              </ChoiceButton>
              <ChoiceButton
                active={sessionScope === "latest"}
                onClick={() => setSessionScope("latest")}
              >
                Latest session
              </ChoiceButton>
            </div>
          </section>

          <section>
            <div className="mb-2 text-sm font-medium">Status Filter</div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={statuses.includes(option.value)}
                    onChange={() => setStatuses((current) => toggleRequired(current, option.value))}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className={`h-2.5 w-2.5 rounded-full ${option.className}`} />
                  {option.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 text-sm font-medium">Aggregations</div>
            <div className="grid grid-cols-2 gap-2">
              {AGGREGATION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={aggregations.includes(option.value)}
                    onChange={() =>
                      setAggregations((current) => toggleRequired(current, option.value))
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </section>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span>Include full roster</span>
            <input
              type="checkbox"
              checked={includeAllMembers}
              onChange={() => setIncludeAllMembers((value) => !value)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              submit({
                format: "pdf",
                session_scope: "all",
                statuses: ["present", "late", "absent"],
                aggregations: ["overall", "sessions", "members", "matrix"],
                include_all_members: true,
              })
            }
            disabled={isExporting}
          >
            Export All PDF
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => submit()} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function toggleRequired<T extends string>(items: T[], item: T): T[] {
  if (items.includes(item)) {
    return items.length === 1 ? items : items.filter((value) => value !== item);
  }
  return [...items, item];
}
