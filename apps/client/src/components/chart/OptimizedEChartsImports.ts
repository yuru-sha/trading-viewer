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
export const enableWebGLRenderer = async () => {
  // 動的インポートで WebGLRenderer を読み込み
  const { WebGLRenderer } = await import('echarts-gl/renderers')
  echarts.use([WebGLRenderer])

  return {
    renderer: 'webgl' as const,
    // WebGL 固有の設定
    enableOptimization: true,
  }
}

// メモリ管理用のヘルパー
export const disposeChart = (chart: any) => {
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
