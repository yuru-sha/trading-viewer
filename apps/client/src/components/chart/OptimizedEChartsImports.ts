// 最適化された ECharts インポート
// 必要な部分のみをインポートしてバンドルサイズを削減

// Core ECharts
import * as echarts from 'echarts/core'

// Chart types - 必要なものだけインポート
import { CandlestickChart, LineChart, BarChart, ScatterChart } from 'echarts/charts'

// Components - 必要なものだけインポート
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  ToolboxComponent,
  BrushComponent,
  GraphicComponent,
} from 'echarts/components'

// Renderers - WebGL はパフォーマンス重視の場合のみ
import {
  CanvasRenderer,
  // SVGRenderer, // 必要に応じてコメントアウト解除
} from 'echarts/renderers'

// Features - 必要なものだけインポート
import { UniversalTransition, LabelLayout } from 'echarts/features'

// ECharts を設定
echarts.use([
  // Chart types
  CandlestickChart,
  LineChart,
  BarChart,
  ScatterChart,

  // Components
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  ToolboxComponent,
  BrushComponent,
  GraphicComponent,

  // Renderers
  CanvasRenderer,

  // Features
  UniversalTransition,
  LabelLayout,
])

// 最適化された ECharts インスタンスをエクスポート
export { echarts }

// 型定義のエクスポート
export type { EChartsOption, SetOptionOpts, ResizeOpts } from 'echarts'

// パフォーマンス設定用のヘルパー
export const getOptimizedEChartsConfig = (dataSize: number) => {
  const isLargeDataset = dataSize > 1000

  return {
    // 大きなデータセットの場合はアニメーションを無効化
    animation: !isLargeDataset,

    // パフォーマンス最適化設定
    ...(isLargeDataset && {
      progressive: 1000,
      progressiveThreshold: 3000,

      // Large rendering for performance
      large: true,
      largeThreshold: 1000,
    }),
  }
}

// チャート特有の最適化設定
export const getCandlestickOptimizations = (dataSize: number) => ({
  ...getOptimizedEChartsConfig(dataSize),

  // Candlestick specific optimizations
  ...(dataSize > 2000 && {
    // 大量データ時は詳細表示を簡略化
    itemStyle: {
      borderWidth: 0, // ボーダーを無効化してレンダリング負荷を削減
    },
  }),
})

export const getLineChartOptimizations = (dataSize: number) => ({
  ...getOptimizedEChartsConfig(dataSize),

  // Line chart specific optimizations
  ...(dataSize > 1000 && {
    // シンボル表示を無効化
    symbol: 'none',
    sampling: 'lttb', // Largest-Triangle-Three-Buckets sampling
  }),
})

// WebGL Renderer を使用する場合の設定（パフォーマンス重視）
// NOTE: echarts-gl is not installed, so WebGL renderer is disabled
export const enableWebGLRenderer = async () => {
  console.warn('WebGL renderer is not available (echarts-gl not installed)')

  return {
    renderer: 'canvas' as const,
    enableOptimization: false,
  }
}

// 動的インポート用のヘルパー
export const loadEChartsExtensions = {
  // 3D チャート機能（大きなライブラリなので必要時のみロード）
  async load3D() {
    try {
      console.log('📊 Loading ECharts 3D extensions...')
      // echarts-gl は現在インストールされていないため、将来の実装用にプレースホルダーとして残す
      console.warn('❌ ECharts GL not available (not installed)')
      return null
    } catch (error) {
      console.warn('❌ ECharts GL not available:', error)
      return null
    }
  },

  // 地理的可視化（必要時のみ）
  async loadGeo() {
    try {
      console.log('🗺️ Loading geo maps...')
      // 地図データは現在利用不可のため、将来の実装用にプレースホルダーとして残す
      console.warn('❌ Geo maps not available (not installed)')
      return false
    } catch (error) {
      console.warn('❌ Failed to load geo maps:', error)
      return false
    }
  },

  // 高度な統計チャート（必要時のみ）
  async loadStatistical() {
    try {
      const { BoxplotChart, CandlestickChart } = await import('echarts/charts')
      echarts.use([BoxplotChart, CandlestickChart])
      console.log('📈 Statistical charts loaded')
      return true
    } catch (error) {
      console.warn('❌ Failed to load statistical charts:', error)
      return false
    }
  },
}

// パフォーマンス監視付きチャート初期化
export const createOptimizedChart = (
  container: HTMLElement,
  options: {
    dataSize?: number
    theme?: string
  } = {}
) => {
  const { dataSize = 0, theme = 'default' } = options

  const performanceConfig = getOptimizedEChartsConfig(dataSize)

  console.log(`📊 Creating chart with ${dataSize} data points`)

  const startTime = performance.now()

  const chart = echarts.init(container, theme, {
    renderer: 'canvas',
    useDirtyRect: true, // パフォーマンス最適化
    width: 'auto',
    height: 'auto',
    ...performanceConfig,
  })

  const initTime = performance.now() - startTime

  if (initTime > 50) {
    console.warn(`🐌 Slow chart initialization: ${initTime.toFixed(2)}ms`)
  }

  return chart
}

// メモリ効率の良いデータ処理
export const processLargeDataset = <T extends Record<string, any>>(
  data: T[],
  options: {
    maxPoints?: number
    samplingMethod?: 'average' | 'lttb' | 'max' | 'min'
  } = {}
): T[] => {
  const { maxPoints = 2000, samplingMethod = 'lttb' } = options

  if (data.length <= maxPoints) {
    return data
  }

  console.log(`📊 Sampling ${data.length} points to ${maxPoints} using ${samplingMethod}`)

  switch (samplingMethod) {
    case 'average':
      return sampleByAverage(data, maxPoints)
    case 'max':
      return sampleByMax(data, maxPoints)
    case 'min':
      return sampleByMin(data, maxPoints)
    case 'lttb':
    default:
      return sampleByLTTB(data, maxPoints)
  }
}

// LTTB (Largest-Triangle-Three-Buckets) サンプリング
const sampleByLTTB = <T extends Record<string, any>>(data: T[], maxPoints: number): T[] => {
  if (data.length <= maxPoints) return data

  const bucketSize = Math.floor(data.length / maxPoints)
  const sampled: T[] = []

  // 最初と最後のポイントは必ず含める
  sampled.push(data[0])

  for (let i = 1; i < maxPoints - 1; i++) {
    const bucketStart = i * bucketSize
    const bucketEnd = Math.min((i + 1) * bucketSize, data.length)

    let maxArea = 0
    let selectedPoint = data[bucketStart]

    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = calculateTriangleArea(
        sampled[sampled.length - 1],
        data[j],
        data[Math.min(bucketEnd, data.length - 1)]
      )

      if (area > maxArea) {
        maxArea = area
        selectedPoint = data[j]
      }
    }

    sampled.push(selectedPoint)
  }

  sampled.push(data[data.length - 1])

  return sampled
}

// 三角形の面積計算
const calculateTriangleArea = (a: any, b: any, c: any): number => {
  const x1 = a.timestamp || a.time || 0
  const y1 = a.close || a.value || 0
  const x2 = b.timestamp || b.time || 0
  const y2 = b.close || b.value || 0
  const x3 = c.timestamp || c.time || 0
  const y3 = c.close || c.value || 0

  return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2)
}

// 平均値サンプリング
const sampleByAverage = <T extends Record<string, any>>(data: T[], maxPoints: number): T[] => {
  const bucketSize = Math.floor(data.length / maxPoints)
  const sampled: T[] = []

  for (let i = 0; i < maxPoints; i++) {
    const start = i * bucketSize
    const end = Math.min(start + bucketSize, data.length)

    if (start < data.length) {
      sampled.push(data[Math.floor((start + end) / 2)])
    }
  }

  return sampled
}

// 最大値サンプリング
const sampleByMax = <T extends Record<string, any>>(data: T[], maxPoints: number): T[] => {
  const bucketSize = Math.floor(data.length / maxPoints)
  const sampled: T[] = []

  for (let i = 0; i < maxPoints; i++) {
    const start = i * bucketSize
    const end = Math.min(start + bucketSize, data.length)

    let maxPoint = data[start]
    let maxValue = maxPoint?.close || maxPoint?.value || 0

    for (let j = start; j < end; j++) {
      const currentValue = data[j]?.close || data[j]?.value || 0
      if (currentValue > maxValue) {
        maxValue = currentValue
        maxPoint = data[j]
      }
    }

    sampled.push(maxPoint)
  }

  return sampled
}

// 最小値サンプリング
const sampleByMin = <T extends Record<string, any>>(data: T[], maxPoints: number): T[] => {
  const bucketSize = Math.floor(data.length / maxPoints)
  const sampled: T[] = []

  for (let i = 0; i < maxPoints; i++) {
    const start = i * bucketSize
    const end = Math.min(start + bucketSize, data.length)

    let minPoint = data[start]
    let minValue = minPoint?.close || minPoint?.value || Infinity

    for (let j = start; j < end; j++) {
      const currentValue = data[j]?.close || data[j]?.value || Infinity
      if (currentValue < minValue) {
        minValue = currentValue
        minPoint = data[j]
      }
    }

    sampled.push(minPoint)
  }

  return sampled
}

// メモリ管理用のヘルパー
export const disposeChart = (chart: unknown) => {
  if (chart && typeof chart.dispose === 'function') {
    chart.dispose()
  }
}

// レンダリングパフォーマンス監視
export const createPerformanceMonitor = () => {
  let renderStart = 0

  return {
    start: () => {
      renderStart = performance.now()
    },

    end: (chartId: string) => {
      const renderTime = performance.now() - renderStart

      if (renderTime > 100) {
        console.warn(`📊 Slow chart render detected: ${renderTime.toFixed(2)}ms for ${chartId}`)
      }

      return renderTime
    },
  }
}
