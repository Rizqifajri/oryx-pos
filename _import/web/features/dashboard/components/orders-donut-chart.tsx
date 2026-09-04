"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { StatSegment } from "../types"

interface OrdersDonutChartProps {
  title: string
  segments: StatSegment[]
  centerLabel?: string
}

export function OrdersDonutChart({
  title,
  segments,
  centerLabel = "Orders",
}: OrdersDonutChartProps) {
  const total = React.useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments],
  )

  const chartData = segments.map((s) => ({
    name: s.label,
    value: s.value,
    fill: s.color,
  }))

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = { value: { label: "Orders" } }
    for (const segment of segments) {
      config[segment.key] = { label: segment.label, color: segment.color }
    }
    return config
  }, [segments])

  return (
    <div className="flex h-full flex-col">
      <h3 className="text-sm font-semibold">{title}</h3>
      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No orders yet</p>
      ) : (
        <div className="mt-2 flex flex-1 flex-col items-center gap-4 sm:flex-row">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[180px] w-[180px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={72}
                strokeWidth={4}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text dominantBaseline="middle" textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                          <tspan
                            className="fill-foreground text-2xl font-bold"
                            x={viewBox.cx}
                            y={viewBox.cy}
                          >
                            {total}
                          </tspan>
                          <tspan
                            className="fill-muted-foreground text-xs"
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 18}
                          >
                            {centerLabel}
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="min-w-0 flex-1 space-y-2">
            {segments.map((segment) => (
              <li key={segment.key} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="truncate text-muted-foreground">{segment.label}</span>
                </div>
                <span className="shrink-0 font-medium tabular-nums">{segment.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
