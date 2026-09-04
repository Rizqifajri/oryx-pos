"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-2)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig

export function BarLabelCustom() {
  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex flex-col gap-1 pb-4 mb-4 border-b">
        <h3 className="text-lg font-semibold">Bar Chart - Custom Label</h3>
        <p className="text-sm text-muted-foreground">January - June 2024</p>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0">
        <ChartContainer className="h-[250px] w-full" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              axisLine={false}
              dataKey="month"
              hide
              tickFormatter={value => value.slice(0, 3)}
              tickLine={false}
              tickMargin={10}
              type="category"
            />
            <XAxis dataKey="desktop" hide type="number" />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4}>
              <LabelList
                className="fill-(--color-label)"
                dataKey="month"
                fontSize={12}
                offset={8}
                position="insideLeft"
              />
              <LabelList
                className="fill-foreground"
                dataKey="desktop"
                fontSize={12}
                offset={8}
                position="right"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div className="flex flex-col items-start gap-2 text-sm pt-4 border-t">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total visitors for the last 6 months
        </div>
      </div>
    </div>
  )
}

export default BarLabelCustom
