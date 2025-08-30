import React, { lazy, Suspense } from 'react'
import { Loading } from '@trading-viewer/ui'

// チャートコンポーネントの遅延読み込み設定
// 初期ページロード時間を改善するため、必要時のみロード

// 技術指標関連コンポーネント
export const LazyIndicatorsDropdown = lazy(() =>
  import('./IndicatorsDropdown').then(module => ({
    default: module.IndicatorsDropdown || module.default,
  }))
)

// 描画ツール関連コンポーネント
export const LazyDrawingToolsPanel = lazy(() =>
  import('./DrawingToolsPanel').then(module => ({
    default: module.DrawingToolsPanel || module.default,
  }))
)

export const LazyDrawingObjectsPanel = lazy(() =>
  import('./DrawingObjectsPanel').then(module => ({
    default: module.DrawingObjectsPanel || module.default,
  }))
)

export const LazyLeftDrawingToolbar = lazy(() =>
  import('./LeftDrawingToolbar').then(module => ({
    default: module.default,
  }))
)

// アラート関連コンポーネント
export const LazyAlertModal = lazy(() =>
  import('./AlertModal').then(module => ({
    default: module.AlertModal || module.default,
  }))
)

// チャート設定コンポーネント
export const LazyChartSettings = lazy(() =>
  import('./ChartSettings').then(module => ({
    default: module.ChartSettings || module.default,
  }))
)

// 保存チャート機能
export const LazySaveChartModal = lazy(() =>
  import('./SaveChartModal').then(module => ({
    default: module.SaveChartModal || module.default,
  }))
)

// 共通の Suspense ラッパー
interface LazyComponentWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  minHeight?: string
}

export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  fallback,
  minHeight = '40px',
}) => (
  <Suspense
    fallback={
      fallback || (
        <div
          className={`flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded`}
          style={{ minHeight }}
        >
          <Loading size='sm' />
        </div>
      )
    }
  >
    {children}
  </Suspense>
)

// 高度な遅延読み込み - インタラクション後にロード
interface IntersectionLazyLoadProps {
  children: React.ReactNode
  threshold?: number
  rootMargin?: string
  fallback?: React.ReactNode
}

export const IntersectionLazyLoad: React.FC<IntersectionLazyLoadProps> = ({
  children,
  threshold = 0.1,
  rootMargin = '50px',
  fallback,
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return (
    <div ref={ref} className='h-full'>
      {isVisible
        ? children
        : fallback || (
            <div className='flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded'>
              <Loading size='sm' />
            </div>
          )}
    </div>
  )
}

// パフォーマンス監視付きラッパー
interface PerformanceLazyLoadProps {
  children: React.ReactNode
  componentName: string
  onLoadComplete?: (loadTime: number) => void
}

export const PerformanceLazyLoad: React.FC<PerformanceLazyLoadProps> = ({
  children,
  componentName,
  onLoadComplete,
}) => {
  const startTime = React.useRef(performance.now())

  React.useEffect(() => {
    const loadTime = performance.now() - startTime.current

    if (loadTime > 100) {
      console.warn(`📊 Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`)
    }

    onLoadComplete?.(loadTime)
  }, [componentName, onLoadComplete])

  return <>{children}</>
}

// チャート関連コンポーネント用のカスタムフック
export const useChartComponentLoader = () => {
  const [loadedComponents, setLoadedComponents] = React.useState<Set<string>>(new Set())

  const preloadComponent = React.useCallback(
    async (componentName: string) => {
      if (loadedComponents.has(componentName)) return

      try {
        switch (componentName) {
          case 'indicators':
            await import('./IndicatorsDropdown')
            break
          case 'drawing-tools':
            await import('./DrawingToolsPanel')
            await import('./DrawingObjectsPanel')
            break
          case 'alerts':
            await import('./AlertModal')
            break
          case 'settings':
            await import('./ChartSettings')
            break
          default:
            console.warn(`Unknown component for preload: ${componentName}`)
        }

        setLoadedComponents(prev => new Set([...prev, componentName]))
      } catch (error) {
        console.error(`Failed to preload component ${componentName}:`, error)
      }
    },
    [loadedComponents]
  )

  const preloadChartComponents = React.useCallback(async () => {
    // よく使用されるコンポーネントを事前ロード
    const promises = [preloadComponent('indicators'), preloadComponent('drawing-tools')]

    await Promise.allSettled(promises)
  }, [preloadComponent])

  return {
    preloadComponent,
    preloadChartComponents,
    loadedComponents,
  }
}
