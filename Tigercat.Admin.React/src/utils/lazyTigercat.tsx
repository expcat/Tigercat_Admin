import {
  Suspense,
  forwardRef,
  lazy,
  type ComponentType,
} from 'react';

function HeavyFallback() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <span className="p2-text-secondary">加载中...</span>
    </div>
  );
}

function lazyNamed<
  M extends Record<string, ComponentType<any>>,
  K extends keyof M & string,
>(loader: () => Promise<M>, exportName: K): M[K] {
  const LazyComp = lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as ComponentType<any> };
  });

  const Wrapped = forwardRef((props: any, ref: any) => (
    <Suspense fallback={<HeavyFallback />}>
      <LazyComp {...props} ref={ref} />
    </Suspense>
  ));
  Wrapped.displayName = `Lazy(${exportName})`;
  return Wrapped as unknown as M[K];
}

export const LineChart = lazyNamed(
  () => import('@expcat/tigercat-react/LineChart'),
  'LineChart',
);
export const BarChart = lazyNamed(
  () => import('@expcat/tigercat-react/BarChart'),
  'BarChart',
);
export const PieChart = lazyNamed(
  () => import('@expcat/tigercat-react/PieChart'),
  'PieChart',
);
export const AreaChart = lazyNamed(
  () => import('@expcat/tigercat-react/AreaChart'),
  'AreaChart',
);
export const DonutChart = lazyNamed(
  () => import('@expcat/tigercat-react/DonutChart'),
  'DonutChart',
);
export const FunnelChart = lazyNamed(
  () => import('@expcat/tigercat-react/FunnelChart'),
  'FunnelChart',
);
export const GaugeChart = lazyNamed(
  () => import('@expcat/tigercat-react/GaugeChart'),
  'GaugeChart',
);
export const HeatmapChart = lazyNamed(
  () => import('@expcat/tigercat-react/HeatmapChart'),
  'HeatmapChart',
);
export const RadarChart = lazyNamed(
  () => import('@expcat/tigercat-react/RadarChart'),
  'RadarChart',
);
export const ScatterChart = lazyNamed(
  () => import('@expcat/tigercat-react/ScatterChart'),
  'ScatterChart',
);
export const TreeMapChart = lazyNamed(
  () => import('@expcat/tigercat-react/TreeMapChart'),
  'TreeMapChart',
);
export const SunburstChart = lazyNamed(
  () => import('@expcat/tigercat-react/SunburstChart'),
  'SunburstChart',
);
export const OrgChart = lazyNamed(
  () => import('@expcat/tigercat-react/OrgChart'),
  'OrgChart',
);
export const ChartCanvas = lazyNamed(
  () => import('@expcat/tigercat-react/ChartCanvas'),
  'ChartCanvas',
);
export const ChartAxis = lazyNamed(
  () => import('@expcat/tigercat-react/ChartAxis'),
  'ChartAxis',
);
export const ChartGrid = lazyNamed(
  () => import('@expcat/tigercat-react/ChartGrid'),
  'ChartGrid',
);
export const ChartSeries = lazyNamed(
  () => import('@expcat/tigercat-react/ChartSeries'),
  'ChartSeries',
);
export const ChartLegend = lazyNamed(
  () => import('@expcat/tigercat-react/ChartLegend'),
  'ChartLegend',
);
export const ChartTooltip = lazyNamed(
  () => import('@expcat/tigercat-react/ChartTooltip'),
  'ChartTooltip',
);
export const RichTextEditor = lazyNamed(
  () => import('@expcat/tigercat-react/RichTextEditor'),
  'RichTextEditor',
);
export const MarkdownEditor = lazyNamed(
  () => import('@expcat/tigercat-react/MarkdownEditor'),
  'MarkdownEditor',
);
export const CodeEditor = lazyNamed(
  () => import('@expcat/tigercat-react/CodeEditor'),
  'CodeEditor',
);
export const ImageAnnotation = lazyNamed(
  () => import('@expcat/tigercat-react/ImageAnnotation'),
  'ImageAnnotation',
);
export const ImageCropper = lazyNamed(
  () => import('@expcat/tigercat-react/ImageCropper'),
  'ImageCropper',
);
export const CropUpload = lazyNamed(
  () => import('@expcat/tigercat-react/CropUpload'),
  'CropUpload',
);
export const Gantt = lazyNamed(
  () => import('@expcat/tigercat-react/Gantt'),
  'Gantt',
);
