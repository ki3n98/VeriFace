"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AttendanceRecord {
  user_id: number
  first_name: string
  last_name: string
  email: string
  status: string
  check_in_time: string | null
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", className: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { value: "late", label: "Late", className: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "absent", label: "Absent", className: "bg-red-500 hover:bg-red-600 text-white" },
] as const

function normalizeStatus(status: unknown): "present" | "late" | "absent" {
  if (typeof status === "string") return status.toLowerCase() as "present" | "late" | "absent"
  if (status && typeof status === "object" && "value" in status) {
    return String((status as { value: string }).value).toLowerCase() as "present" | "late" | "absent"
  }
  return "absent"
}

interface StatusDropdownProps {
  record: AttendanceRecord
  updating: boolean
  onStatusChange: (record: AttendanceRecord, status: "present" | "late" | "absent") => void
}

export function StatusDropdown({ record, updating, onStatusChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const status = normalizeStatus(record.status)
  const currentOption = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[2]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !updating && setOpen((o) => !o)}
        disabled={updating}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white",
          "border-0 focus:ring-2 focus:ring-primary/50 focus:outline-none",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          currentOption.className
        )}
      >
        {currentOption.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 min-w-[120px] rounded-lg border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onStatusChange(record, opt.value)
                setOpen(false)
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm font-medium",
                opt.className,
                "first:rounded-t-lg last:rounded-b-lg"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
