import { type TElement } from "platejs";
import { createTPlatePlugin } from "platejs/react";
import AreaChartElement from "../custom-elements/area-chart";
import BarGraphElement from "../custom-elements/bar-graph";
import ComposedChartElement from "../custom-elements/composed-chart";
import FunnelChartElement from "../custom-elements/funnel-chart";
import LineGraphElement from "../custom-elements/line-graph";
import PieChartElement from "../custom-elements/pie-chart";
import RadarChartElement from "../custom-elements/radar-chart";
import RadialBarChartElement from "../custom-elements/radial-bar-chart";
import ScatterPlotElement from "../custom-elements/scatter-plot";
import AreaChartStatic from "../custom-elements/static/area-chart-static";
import BarGraphStatic from "../custom-elements/static/bar-graph-static";
import ComposedChartStatic from "../custom-elements/static/composed-chart-static";
import FunnelChartStatic from "../custom-elements/static/funnel-chart-static";
import LineGraphStatic from "../custom-elements/static/line-graph-static";
import PieChartStatic from "../custom-elements/static/pie-chart-static";
import RadarChartStatic from "../custom-elements/static/radar-chart-static";
import RadialBarChartStatic from "../custom-elements/static/radial-bar-chart-static";
import ScatterPlotStatic from "../custom-elements/static/scatter-plot-static";
import TreemapChartStatic from "../custom-elements/static/treemap-chart-static";
import TreemapChartElement from "../custom-elements/treemap-chart";
import {
  AREA_CHART_ELEMENT,
  BAR_CHART_ELEMENT,
  COMPOSED_CHART_ELEMENT,
  FUNNEL_CHART_ELEMENT,
  LINE_CHART_ELEMENT,
  PIE_CHART_ELEMENT,
  RADAR_CHART_ELEMENT,
  RADIAL_BAR_CHART_ELEMENT,
  SCATTER_CHART_ELEMENT,
  TREEMAP_CHART_ELEMENT,
} from "../lib";

export type TChartNode = TElement & {
  chartType?:
    | "bar"
    | "line"
    | "pie"
    | "scatter"
    | "histogram"
    | "funnel"
    | "treemap"
    | "radialBar"
    | "composed";
  data?: unknown;
  options?: Record<string, unknown>;
};

// Individual chart plugins (editable)
export const PieChartPlugin = createTPlatePlugin({
  key: PIE_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: PIE_CHART_ELEMENT,
    component: PieChartElement,
  },
});

export const BarChartPlugin = createTPlatePlugin({
  key: BAR_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: BAR_CHART_ELEMENT,
    component: BarGraphElement,
  },
});

export const AreaChartPlugin = createTPlatePlugin({
  key: AREA_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: AREA_CHART_ELEMENT,
    component: AreaChartElement,
  },
});

export const ScatterChartPlugin = createTPlatePlugin({
  key: SCATTER_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: SCATTER_CHART_ELEMENT,
    component: ScatterPlotElement,
  },
});

export const LineChartPlugin = createTPlatePlugin({
  key: LINE_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: LINE_CHART_ELEMENT,
    component: LineGraphElement,
  },
});

export const RadarChartPlugin = createTPlatePlugin({
  key: RADAR_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: RADAR_CHART_ELEMENT,
    component: RadarChartElement,
  },
});

export const FunnelChartPlugin = createTPlatePlugin({
  key: FUNNEL_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: FUNNEL_CHART_ELEMENT,
    component: FunnelChartElement,
  },
});

export const TreemapChartPlugin = createTPlatePlugin({
  key: TREEMAP_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: TREEMAP_CHART_ELEMENT,
    component: TreemapChartElement,
  },
});

export const RadialBarChartPlugin = createTPlatePlugin({
  key: RADIAL_BAR_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: RADIAL_BAR_CHART_ELEMENT,
    component: RadialBarChartElement,
  },
});

export const ComposedChartPlugin = createTPlatePlugin({
  key: COMPOSED_CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    type: COMPOSED_CHART_ELEMENT,
    component: ComposedChartElement,
  },
});

// Individual chart plugins (static)
export const PieChartStaticPlugin = createTPlatePlugin({
  key: PIE_CHART_ELEMENT,
  node: { isElement: true, component: PieChartStatic },
});

export const BarChartStaticPlugin = createTPlatePlugin({
  key: BAR_CHART_ELEMENT,
  node: { isElement: true, component: BarGraphStatic },
});

export const AreaChartStaticPlugin = createTPlatePlugin({
  key: AREA_CHART_ELEMENT,
  node: { isElement: true, component: AreaChartStatic },
});

export const ScatterChartStaticPlugin = createTPlatePlugin({
  key: SCATTER_CHART_ELEMENT,
  node: { isElement: true, component: ScatterPlotStatic },
});

export const LineChartStaticPlugin = createTPlatePlugin({
  key: LINE_CHART_ELEMENT,
  node: { isElement: true, component: LineGraphStatic },
});

export const RadarChartStaticPlugin = createTPlatePlugin({
  key: RADAR_CHART_ELEMENT,
  node: { isElement: true, component: RadarChartStatic },
});

export const FunnelChartStaticPlugin = createTPlatePlugin({
  key: FUNNEL_CHART_ELEMENT,
  node: { isElement: true, component: FunnelChartStatic },
});

export const TreemapChartStaticPlugin = createTPlatePlugin({
  key: TREEMAP_CHART_ELEMENT,
  node: { isElement: true, component: TreemapChartStatic },
});

export const RadialBarChartStaticPlugin = createTPlatePlugin({
  key: RADIAL_BAR_CHART_ELEMENT,
  node: { isElement: true, component: RadialBarChartStatic },
});

export const ComposedChartStaticPlugin = createTPlatePlugin({
  key: COMPOSED_CHART_ELEMENT,
  node: { isElement: true, component: ComposedChartStatic },
});
