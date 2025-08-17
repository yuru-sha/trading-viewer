import React, { lazy, Suspense } from 'react'
import { Loading } from '@trading-viewer/ui'

// ECharts コンポーネントの動的インポート（コード分割でバンドルサイズ最適化）
const EChartsTradingChart = lazy(() =>
  import('./EChartsTradingChart').then(module => ({
    default: module.EChartsTradingChart,
  }))
)

// ECharts の重い依存関係を必要時のみロード
const OptimizedEChartsImports = lazy(() =>
  import('./OptimizedEChartsImports').then(() => ({
    default: () => null, // インポート処理のみ
  }))
)

interface LazyEChartsWrapperProps {
  children: (EChartsComponent: typeof EChartsTradingChart) => React.ReactNode
}

/**
 * ECharts の動的ローディングラッパー
 *
 * 目的:
 * - 初回ページロード時間の改善（54MB の ECharts を遅延ロード）
 * - チャート機能を使わないユーザーには ECharts をロードしない
 * - コード分割によるバンドルサイズの最適化
 */
export const LazyEChartsWrapper: React.FC<LazyEChartsWrapperProps> = ({ children }) => {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg'>
          <div className='text-center'>
            <Loading size='lg' />
            <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
              チャートライブラリを読み込み中...
            </p>
          </div>
        </div>
      }
    >
      <Suspense fallback={null}>
        <OptimizedEChartsImports />
      </Suspense>
      {children(EChartsTradingChart)}
    </Suspense>
  )
}

/**
 * 直接使用可能な遅延ロード ECharts コンポーネント
 */
export const LazyEChartsTradingChart = React.forwardRef<
  any,
  React.ComponentProps<typeof EChartsTradingChart>
>((props, ref) => (
  <LazyEChartsWrapper>
    {EChartsComponent => <EChartsComponent ref={ref} {...props} />}
  </LazyEChartsWrapper>
))

LazyEChartsTradingChart.displayName = 'LazyEChartsTradingChart'
