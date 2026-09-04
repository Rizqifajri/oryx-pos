import type { StatSegment } from "../types"

interface StackedBarChartProps {
  title: string
  segments: StatSegment[]
  emptyMessage?: string
}

function segmentPercent(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 1000) / 10
}

export function StackedBarChart({
  title,
  segments,
  emptyMessage = "No data yet",
}: StackedBarChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="flex h-full flex-col">
      <h3 className="text-sm font-semibold">{title}</h3>
      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <div className="mt-4 flex h-8 w-full overflow-hidden rounded-md">
            {segments.map((segment) => (
              <div
                key={segment.key}
                className="h-full min-w-[2px] transition-all"
                style={{
                  width: `${(segment.value / total) * 100}%`,
                  backgroundColor: segment.color,
                }}
                title={`${segment.label}: ${segment.value}`}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-2.5">
            {segments.map((segment) => (
              <li key={segment.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-muted-foreground">{segment.label}</span>
                </div>
                <span className="font-medium tabular-nums">
                  {segment.value}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({segmentPercent(segment.value, total)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
