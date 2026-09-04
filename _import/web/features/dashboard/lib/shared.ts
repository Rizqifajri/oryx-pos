import type { StatSegment } from "../types"

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  PENDING: "New",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
  CANCELLED: "Canceled",
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function toSegments(
  counts: Record<string, number>,
  labelMap: Record<string, string>,
): StatSegment[] {
  const entries = Object.entries(counts).filter(([, v]) => v > 0)
  const total = entries.reduce((sum, [, v]) => sum + v, 0)
  if (total === 0) return []

  return entries.map(([key, value], index) => ({
    key,
    label: labelMap[key] ?? key,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
}

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function isThisMonth(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export function normalizeOrderStatus(status: string): string {
  const upper = status.toUpperCase()
  if (upper === "PENDING") return "NEW"
  if (upper === "CANCELLED") return "CANCELED"
  return upper
}
