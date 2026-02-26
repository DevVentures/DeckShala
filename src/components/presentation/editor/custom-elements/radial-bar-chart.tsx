"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { type TChartNode } from "../plugins/chart-plugin";

type AnyRecord = Record<string, unknown>;

function getLabelKey(data: unknown[]): string {
  if (data.length === 0) return "label";
  const sample = data[0] as AnyRecord;
  if ("label" in sample) return "label";
  if ("name" in sample) return "name";
  return "label";
}

function getValueKey(data: unknown[]): string {
  if (data.length === 0) return "value";
  const sample = data[0] as AnyRecord;
  if ("value" in sample) return "value";
  if ("percentage" in sample) return "percentage";
  return "value";
}

// Generate colors from chart color variables
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function RadialBarChartElement(
  props: PlateElementProps<TChartNode>,
) {
  const rawData = (props.element as TChartNode).data as unknown;
  const dataArray = Array.isArray(rawData) ? (rawData as AnyRecord[]) : [];
  const labelKey = getLabelKey(dataArray);
  const valueKey = getValueKey(dataArray);

  // Add fill color to each data item
  const dataWithColors = dataArray.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const chartConfig: ChartConfig = {
    [valueKey]: {
      label: "Value",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <PlateElement {...props}>
      <div
        className={cn(
          "relative mb-4 w-full rounded-lg border bg-card p-2 shadow-sm",
        )}
        style={{
          backgroundColor: "var(--presentation-background)",
          color: "var(--presentation-text)",
          borderColor: "hsl(var(--border))",
        }}
        contentEditable={false}
      >
        <ChartContainer className="h-80 w-full" config={chartConfig}>
          <RadialBarChart
            data={dataWithColors}
            innerRadius="10%"
            outerRadius="100%"
            barSize={20}
            startAngle={90}
            endAngle={-270}
          >
            <PolarGrid gridType="circle" />
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <RadialBar
              dataKey={valueKey}
              cornerRadius={5}
              label={{
                position: "insideStart",
                fill: "#fff",
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              layout="vertical"
              verticalAlign="middle"
              align="right"
              formatter={(value, entry) => {
                const item = entry.payload as AnyRecord;
                return `${item[labelKey]}: ${item[valueKey]}${typeof item[valueKey] === "number" && item[valueKey] <= 100 ? "%" : ""}`;
              }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadialBarChart>
        </ChartContainer>
        {/* non-editable */}
      </div>
    </PlateElement>
  );
}
