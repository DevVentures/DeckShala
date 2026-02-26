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
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { type TChartNode } from "../../plugins/chart-plugin";

type AnyRecord = Record<string, unknown>;

function getLabelKey(data: unknown[]): string {
  if (data.length === 0) return "label";
  const sample = data[0] as AnyRecord;
  if ("label" in sample) return "label";
  if ("name" in sample) return "name";
  if ("month" in sample) return "month";
  return "label";
}

function getValueKeys(data: unknown[]): string[] {
  if (data.length === 0) return ["value1", "value2", "value3"];
  const sample = data[0] as AnyRecord;
  const labelKey = getLabelKey(data);

  const valueKeys = Object.keys(sample).filter((key) => {
    const value = sample[key];
    return key !== labelKey && typeof value === "number";
  });

  return valueKeys.length > 0 ? valueKeys : ["value1", "value2", "value3"];
}

export default function ComposedChartStatic(
  props: PlateElementProps<TChartNode>,
) {
  const rawData = (props.element as TChartNode).data as unknown;
  const dataArray = Array.isArray(rawData) ? (rawData as AnyRecord[]) : [];
  const labelKey = getLabelKey(dataArray);
  const valueKeys = getValueKeys(dataArray);

  const chartConfig: ChartConfig = valueKeys.reduce(
    (config, key, index) => ({
      ...config,
      [key]: {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      },
    }),
    {} as ChartConfig,
  );

  return (
    <PlateElement {...props}>
      <div
        className={cn(
          "relative mb-4 w-full rounded-lg border bg-card p-2 shadow-sm",
        )}
        contentEditable={false}
      >
        <ChartContainer className="h-80 w-full" config={chartConfig}>
          <ComposedChart data={dataArray}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={labelKey} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />

            {valueKeys.map((key, index) => {
              const chartType = index % 3;

              if (chartType === 0) {
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={`var(--color-${key})`}
                    radius={4}
                  />
                );
              }

              if (chartType === 1) {
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={`var(--color-${key})`}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                );
              }

              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  fillOpacity={0.3}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                />
              );
            })}

            <Legend />
            <ChartTooltip content={<ChartTooltipContent />} />
          </ComposedChart>
        </ChartContainer>
      </div>
    </PlateElement>
  );
}
