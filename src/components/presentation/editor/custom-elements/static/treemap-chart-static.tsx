"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { ResponsiveContainer, Treemap } from "recharts";
import { type TChartNode } from "../../plugins/chart-plugin";

type AnyRecord = Record<string, unknown>;

function getNameKey(data: unknown[]): string {
  if (data.length === 0) return "name";
  const sample = data[0] as AnyRecord;
  if ("name" in sample) return "name";
  if ("label" in sample) return "label";
  return "name";
}

function getSizeKey(data: unknown[]): string {
  if (data.length === 0) return "size";
  const sample = data[0] as AnyRecord;
  if ("size" in sample) return "size";
  if ("value" in sample) return "value";
  return "size";
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
}

const CustomizedContent = (props: TreemapContentProps) => {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name, value } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: CHART_COLORS[index % CHART_COLORS.length],
          stroke: "#fff",
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 7}
            textAnchor="middle"
            fill="#fff"
            fontSize={14}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 7}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
          >
            {value}
          </text>
        </>
      )}
    </g>
  );
};

export default function TreemapChartStatic(
  props: PlateElementProps<TChartNode>,
) {
  const rawData = (props.element as TChartNode).data as unknown;
  const dataArray = Array.isArray(rawData) ? (rawData as AnyRecord[]) : [];
  const nameKey = getNameKey(dataArray);
  const sizeKey = getSizeKey(dataArray);

  const chartConfig: ChartConfig = {
    [sizeKey]: {
      label: "Size",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <PlateElement {...props}>
      <div
        className={cn(
          "relative mb-4 w-full rounded-lg border bg-card p-2 shadow-sm",
        )}
        contentEditable={false}
      >
        <ChartContainer className="h-80 w-full" config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={dataArray}
              dataKey={sizeKey}
              nameKey={nameKey}
              content={<CustomizedContent />}
              isAnimationActive={false}
            >
              <ChartTooltip content={<ChartTooltipContent />} />
            </Treemap>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </PlateElement>
  );
}
