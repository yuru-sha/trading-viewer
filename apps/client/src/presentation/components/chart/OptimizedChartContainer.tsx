import React, {
  useCallback,
  forwardRef,
  useImperativeHandle,
  memo,
  useMemo,
  useRef,
  useEffect,
} from 'react'
import { Loading } from '@trading-viewer/ui'
import {
  LazyEChartsTradingChart,
  EChartsTradingChartRef,
} from '@/presentation/components/chart/LazyEChartsWrapper'
import LeftDrawingToolbar, {
  LeftDrawingToolbarRef,
} from '@/presentation/components/chart/LeftDrawingToolbar'
import DrawingContextMenu from '@/presentation/components/chart/DrawingContextMenu'
import { PriceData } from '@/infrastructure/utils/indicators'
import { DrawingToolType } from '@trading-viewer/shared'
import { useChartDataManager } from '@/presentation/hooks/chart/useChartDataManager'
import { useChartRendering } from '@/presentation/hooks/chart/useChartRendering'
import { useChartDrawingManager } from '@/presentation/hooks/chart/useChartDrawingManager'
import { useIndicators } from '@/presentation/hooks/useIndicators'
import { log } from '@/infrastructure/services/LoggerService'

interface OptimizedChartContainerProps {
  symbol: string
  data: PriceData[]
  currentPrice?: number
  isLoading?: boolean
  isRealTime?: boolean
  onSymbolChange?: (symbol: string) => void
  className?: string
  chartType?: 'candle' | 'line' | 'area'
  timeframe?: string
  showGridlines?: boolean
  showDrawingTools?: boolean
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
  periodWeeks?: number
}

const defaultSettings = {
  showVolume: true,
  showDrawingTools: true,
}

// Chart container ref interface
export interface OptimizedChartContainerRef {
  takeScreenshot: (filename?: string) => void
}

// Memoized Loading component
const MemoizedLoading = memo(() => (
  <div className='flex justify-center items-center h-full'>
    <Loading />
  </div>
))
MemoizedLoading.displayName = 'MemoizedLoading'

// Memoized Drawing Toolbar
const MemoizedDrawingToolbar = memo<{
  ref: React.RefObject<LeftDrawingToolbarRef>
  onToolSelect: (tool: DrawingToolType | null) => void
  selectedTool: DrawingToolType | null
  isDrawingMode: boolean
}>(({ ref, onToolSelect, selectedTool, isDrawingMode }) => (
  <LeftDrawingToolbar
    ref={ref}
    onToolSelect={onToolSelect}
    selectedTool={selectedTool}
    isDrawingMode={isDrawingMode}
  />
))
MemoizedDrawingToolbar.displayName = 'MemoizedDrawingToolbar'

// Memoized Context Menu
const MemoizedContextMenu = memo<{
  isVisible: boolean
  position: { x: number; y: number }
  onAction: (action: string) => void
  onClose: () => void
}>(({ isVisible, position, onAction, onClose }) => (
  <DrawingContextMenu
    isVisible={isVisible}
    position={position}
    onAction={onAction}
    onClose={onClose}
  />
))
MemoizedContextMenu.displayName = 'MemoizedContextMenu'

export const OptimizedChartContainer = memo(
  forwardRef<OptimizedChartContainerRef, OptimizedChartContainerProps>(
    (
      {
        symbol,
        data,
        currentPrice,
        isLoading = false,
        isRealTime = false,
        onSymbolChange: _onSymbolChange,
        className = '',
        chartType = 'candle',
        timeframe = '1D',
        showGridlines = true,
        showDrawingTools = defaultSettings.showDrawingTools,
        showPeriodHigh = true,
        showPeriodLow = true,
        periodWeeks = 4,
      },
      ref
    ) => {
      // Refs
      const leftToolbarRef = useRef<LeftDrawingToolbarRef>(null)
      const chartRef = useRef<EChartsTradingChartRef>(null)

      // Memoized chart data processing
      const processedData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Only process if data actually changed
        return data.map(item => ({
          ...item,
          // Add any necessary data transformations here
          id: `${item.timestamp}-${item.symbol || symbol}`,
        }))
      }, [data, symbol])

      // Memoized current price calculation
      const memoizedCurrentPrice = useMemo(() => {
        if (currentPrice !== undefined) return currentPrice
        if (processedData.length === 0) return undefined
        return processedData[processedData.length - 1]?.close
      }, [currentPrice, processedData])

      // Chart data manager with memoization
      useChartDataManager({
        symbol,
        data: processedData,
        timeframe,
        isRealTime,
      })

      // Chart rendering manager with performance optimizations
      useChartRendering({
        chartType,
        showGridlines,
        showPeriodHigh,
        showPeriodLow,
        periodWeeks,
        data: processedData,
      })

      // Drawing manager with memoized callbacks
      const drawingManager = useChartDrawingManager({
        enabled: showDrawingTools,
        data: processedData,
      })

      // Indicators with memoized configuration
      const { data: indicatorData = [] } = useIndicators(symbol, timeframe)

      // Memoized callbacks
      const handleToolSelect = useCallback(
        (tool: DrawingToolType) => {
          log.business.info('Drawing tool selected from toolbar', {
            operation: 'tool_selection',
            toolType: tool,
          })
          drawingManager.selectTool?.(tool)
        },
        [drawingManager]
      )

      const handleCrosshairMove = useCallback((price: number | null, time: number | null) => {
        // Throttled crosshair updates
        if (price !== null && time !== null) {
          // Update crosshair data
        }
      }, [])

      const handleChartClick = useCallback(() => {
        log.business.info('Chart clicked', {
          operation: 'chart_interaction',
        })
        // Handle chart interactions
      }, [])

      const handleContextMenuAction = useCallback(
        (action: string) => {
          log.business.info('Drawing context menu action triggered', {
            operation: 'context_menu_action',
            action,
          })
          drawingManager.handleContextAction?.(action)
        },
        [drawingManager]
      )

      const handleContextMenuClose = useCallback(() => {
        drawingManager.hideContextMenu?.()
      }, [drawingManager])

      // Memoized chart options
      const chartOptions = useMemo(
        () => ({
          width: '100%',
          height: '100%',
          showVolume: defaultSettings.showVolume,
          currentPrice: memoizedCurrentPrice,
          onCrosshairMove: handleCrosshairMove,
          symbol,
          chartType,
          enableDrawingTools: showDrawingTools,
          drawingTools: drawingManager.drawingTools,
          timeframe,
          showGridlines,
          showPeriodHigh,
          showPeriodLow,
          periodWeeks,
          onChartClick: handleChartClick,
          indicators: indicatorData,
        }),
        [
          memoizedCurrentPrice,
          handleCrosshairMove,
          symbol,
          chartType,
          showDrawingTools,
          drawingManager.drawingTools,
          timeframe,
          showGridlines,
          showPeriodHigh,
          showPeriodLow,
          periodWeeks,
          handleChartClick,
          indicatorData,
        ]
      )

      // Imperative methods
      useImperativeHandle(
        ref,
        () => ({
          takeScreenshot: (filename?: string) => {
            if (chartRef.current) {
              const canvas = chartRef.current.getEchartsInstance().getDom().querySelector('canvas')
              if (canvas) {
                const link = document.createElement('a')
                link.download = filename || `chart-${symbol}-${Date.now()}.png`
                link.href = canvas.toDataURL()
                link.click()
              }
            }
          },
        }),
        [symbol]
      )

      // Performance monitoring
      useEffect(() => {
        const startTime = performance.now()

        return () => {
          const endTime = performance.now()
          const renderTime = endTime - startTime

          if (renderTime > 100) {
            // Log if render takes more than 100ms
            log.performance.warn('Slow chart render detected', {
              operation: 'chart_render',
              renderTime: parseFloat(renderTime.toFixed(2)),
              symbol,
              threshold: 100,
            })
          }
        }
      }, [symbol, processedData])

      // Early return for loading state
      if (isLoading) {
        return <MemoizedLoading />
      }

      // Early return for empty data
      if (!processedData || processedData.length === 0) {
        return (
          <div className='flex justify-center items-center h-full text-gray-500'>
            No chart data available for {symbol}
          </div>
        )
      }

      return (
        <div className={`relative w-full h-full ${className}`}>
          {/* Drawing Tools Sidebar */}
          {showDrawingTools && (
            <MemoizedDrawingToolbar
              ref={leftToolbarRef}
              onToolSelect={handleToolSelect}
              selectedTool={drawingManager.selectedTool}
              isDrawingMode={drawingManager.isDrawingMode}
            />
          )}

          {/* Main Chart Area */}
          <div className={`${showDrawingTools ? 'ml-12' : ''} h-full`}>
            <LazyEChartsTradingChart
              ref={chartRef}
              data={processedData}
              {...chartOptions}
              className='w-full h-full'
            />
          </div>

          {/* Context Menu */}
          <MemoizedContextMenu
            isVisible={drawingManager.contextMenu.isVisible}
            position={drawingManager.contextMenu.position}
            onAction={handleContextMenuAction}
            onClose={handleContextMenuClose}
          />
        </div>
      )
    }
  )
)

OptimizedChartContainer.displayName = 'OptimizedChartContainer'

export default OptimizedChartContainer
