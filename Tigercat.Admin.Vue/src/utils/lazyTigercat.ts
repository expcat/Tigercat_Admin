import { defineAsyncComponent, defineComponent, h, type Component } from 'vue'

const loadingComponent = defineComponent({
  name: 'LazyTigercatFallback',
  setup() {
    return () =>
      h('div', { class: 'flex min-h-40 items-center justify-center' }, [
        h('span', { class: 'p2-text-secondary' }, '加载中...'),
      ])
  },
})

function lazyNamed(
  loader: () => Promise<Record<string, Component>>,
  exportName: string,
) {
  return defineAsyncComponent({
    loader: () => loader().then((mod) => mod[exportName]),
    loadingComponent,
  })
}

export const LineChart = lazyNamed(
  () => import('@expcat/tigercat-vue/LineChart'),
  'LineChart',
)
export const BarChart = lazyNamed(
  () => import('@expcat/tigercat-vue/BarChart'),
  'BarChart',
)
export const PieChart = lazyNamed(
  () => import('@expcat/tigercat-vue/PieChart'),
  'PieChart',
)
export const AreaChart = lazyNamed(
  () => import('@expcat/tigercat-vue/AreaChart'),
  'AreaChart',
)
export const FunnelChart = lazyNamed(
  () => import('@expcat/tigercat-vue/FunnelChart'),
  'FunnelChart',
)
export const GaugeChart = lazyNamed(
  () => import('@expcat/tigercat-vue/GaugeChart'),
  'GaugeChart',
)
export const HeatmapChart = lazyNamed(
  () => import('@expcat/tigercat-vue/HeatmapChart'),
  'HeatmapChart',
)
export const RadarChart = lazyNamed(
  () => import('@expcat/tigercat-vue/RadarChart'),
  'RadarChart',
)
export const ScatterChart = lazyNamed(
  () => import('@expcat/tigercat-vue/ScatterChart'),
  'ScatterChart',
)
export const TreeMapChart = lazyNamed(
  () => import('@expcat/tigercat-vue/TreeMapChart'),
  'TreeMapChart',
)
export const SunburstChart = lazyNamed(
  () => import('@expcat/tigercat-vue/SunburstChart'),
  'SunburstChart',
)
export const OrgChart = lazyNamed(
  () => import('@expcat/tigercat-vue/OrgChart'),
  'OrgChart',
)
export const ChartCanvas = lazyNamed(
  () => import('@expcat/tigercat-vue/ChartCanvas'),
  'ChartCanvas',
)
export const ChartAxis = lazyNamed(
  () => import('@expcat/tigercat-vue/ChartAxis'),
  'ChartAxis',
)
export const ChartGrid = lazyNamed(
  () => import('@expcat/tigercat-vue/ChartGrid'),
  'ChartGrid',
)
export const ChartSeries = lazyNamed(
  () => import('@expcat/tigercat-vue/ChartSeries'),
  'ChartSeries',
)
export const ChartLegend = lazyNamed(
  () => import('@expcat/tigercat-vue/ChartLegend'),
  'ChartLegend',
)
export const ChartTooltip = lazyNamed(
  () => import('@expcat/tigercat-vue/ChartTooltip'),
  'ChartTooltip',
)
export const RichTextEditor = lazyNamed(
  () => import('@expcat/tigercat-vue/RichTextEditor'),
  'RichTextEditor',
)
export const MarkdownEditor = lazyNamed(
  () => import('@expcat/tigercat-vue/MarkdownEditor'),
  'MarkdownEditor',
)
export const CodeEditor = lazyNamed(
  () => import('@expcat/tigercat-vue/CodeEditor'),
  'CodeEditor',
)
export const ImageAnnotation = lazyNamed(
  () => import('@expcat/tigercat-vue/ImageAnnotation'),
  'ImageAnnotation',
)
export const ImageCropper = lazyNamed(
  () => import('@expcat/tigercat-vue/ImageCropper'),
  'ImageCropper',
)
export const CropUpload = lazyNamed(
  () => import('@expcat/tigercat-vue/CropUpload'),
  'CropUpload',
)
export const Gantt = lazyNamed(
  () => import('@expcat/tigercat-vue/Gantt'),
  'Gantt',
)
