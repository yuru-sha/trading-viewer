import React, { useCallback, forwardRef, useImperativeHandle } from 'react'
import { Loading } from '@trading-viewer/ui'
import { LazyEChartsTradingChart } from './LazyEChartsWrapper'
import LeftDrawingToolbar, { LeftDrawingToolbarRef } from './LeftDrawingToolbar'
import DrawingContextMenu from './DrawingContextMenu'
import { PriceData } from '../../utils/indicators'
import { DrawingToolType } from '@trading-viewer/shared'
import { useChartDataManager } from '../../hooks/chart/useChartDataManager'
import { useChartRendering } from '../../hooks/chart/useChartRendering'
import { useChartDrawingManager } from '../../hooks/chart/useChartDrawingManager'
import { useIndicators } from '../../hooks/useIndicators'

interface TechnicalIndicators {
  sma?: { enabled: boolean; periods: number[] }
  ema?: { enabled: boolean; periods: number[] }
  rsi?: { enabled: boolean; period: number }
  macd?: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number }
  bollingerBands?: { enabled: boolean; period: number; standardDeviations: number }
}

interface ChartContainerProps {
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
  showVolume?: boolean
}

const defaultSettings = {
  showVolume: true,
  showDrawingTools: true, // デフォルトで描画ツールを表示
}

// Chart container ref interface
export interface ChartContainerRef {
  takeScreenshot: (filename?: string) => void
}

export const ChartContainer = forwardRef<ChartContainerRef, ChartContainerProps>(
  (
    {
      symbol,
      data,
      currentPrice,
      isLoading = false,
      isRealTime = false,
      onSymbolChange,
      className = '',
      chartType = 'candle',
      timeframe,
      showGridlines = true,
      showDrawingTools,
      showPeriodHigh = true,
      showPeriodLow = true,
      periodWeeks = 52,
      showVolume = true,
    },
    ref
  ) => {
    // Separated concerns using custom hooks
    const dataManager = useChartDataManager({
      symbol,
      data,
      currentPrice,
      isLoading,
      isRealTime,
    })

    const renderingManager = useChartRendering({
      showDrawingTools: showDrawingTools ?? defaultSettings.showDrawingTools,
    })

    const drawingManager = useChartDrawingManager({
      symbol,
      timeframe,
      autoSave: true,
      autoSaveInterval: 1000,
    })

    // Get indicators for the current symbol and timeframe
    const { data: indicators = [] } = useIndicators(symbol, timeframe)

    // Drawing toolbar ref to close objects panel
    const drawingToolbarRef = React.useRef<LeftDrawingToolbarRef>(null)

    // Expose takeScreenshot method through ref
    useImperativeHandle(
      ref,
      () => ({
        takeScreenshot: renderingManager.takeScreenshot,
      }),
      [renderingManager.takeScreenshot]
    )

    // Handle drawing tool selection with detailed logging
    const handleToolSelect = useCallback(
      (toolType: DrawingToolType | null) => {
        console.log('🔧 ChartContainer - Tool selected:', toolType)
        console.log('🔧 Drawing tools state before setToolType:', {
          activeToolType: drawingManager.drawingTools.activeToolType,
          drawingMode: drawingManager.drawingTools.drawingMode,
          canDraw: drawingManager.drawingTools.canDraw,
          isDrawing: drawingManager.drawingTools.isDrawing,
        })

        drawingManager.drawingTools.setToolType(toolType)

        // 状態更新後の確認は次のレンダリングサイクルで行う
        setTimeout(() => {
          console.log('🔧 Drawing tools state after setToolType (next tick):', {
            activeToolType: drawingManager.drawingTools.activeToolType,
            drawingMode: drawingManager.drawingTools.drawingMode,
            canDraw: drawingManager.drawingTools.canDraw,
            isDrawing: drawingManager.drawingTools.isDrawing,
          })
        }, 0)
      },
      [drawingManager.drawingTools]
    )

    // Handle chart click to close panels
    const handleChartClick = useCallback(() => {
      if (drawingToolbarRef.current) {
        drawingToolbarRef.current.closeObjectsPanel()
      }
    }, [])

    // Handle crosshair move
    const handleCrosshairMove = useCallback((price: number, time: number) => {
      // カーソル位置の価格表示を復活させる
      // 必要に応じてここで価格表示の処理を行う
    }, [])

    // Early returns for loading and no data states
    if (dataManager.isInitialLoading) {
      return (
        <div
          className={`flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg border ${className}`}
        >
          <Loading size='lg' text='Loading chart data...' />
        </div>
      )
    }

    if (!dataManager.hasData) {
      return (
        <div
          className={`flex flex-col items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg border ${className}`}
        >
          <svg
            className='w-16 h-16 text-gray-400 mb-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
            />
          </svg>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>No Chart Data</h3>
          <p className='text-sm text-gray-500 dark:text-gray-400 text-center max-w-md'>
            No price data available for {symbol}. The symbol might not be supported or market data
            is temporarily unavailable.
          </p>
        </div>
      )
    }

    return (
      <div className={`h-full flex relative ${className}`}>
        {/* Left Drawing Toolbar */}
        {(showDrawingTools ?? renderingManager.settings.showDrawingTools) && (
          <LeftDrawingToolbar
            ref={drawingToolbarRef}
            activeTool={drawingManager.drawingTools.activeToolType}
            onToolSelect={handleToolSelect}
            objects={drawingManager.getDrawingObjects()}
            onToggleObjectVisibility={drawingManager.toggleDrawingToolVisibility}
            onRemoveObject={drawingManager.deleteDrawingTool}
            onChangeObjectColor={drawingManager.changeDrawingToolColor}
            className=''
          />
        )}

        {/* Main Chart Area - Full height */}
        <div className='flex-1 min-w-0'>
          <LazyEChartsTradingChart
            ref={renderingManager.chartRef}
            onChartClick={handleChartClick}
            data={dataManager.data}
            currentPrice={dataManager.latestPrice}
            showVolume={showVolume}
            className='h-full'
            enableDrawingTools={showDrawingTools ?? renderingManager.settings.showDrawingTools}
            drawingTools={drawingManager.drawingTools}
            symbol={symbol}
            chartType={chartType}
            timeframe={timeframe}
            showGridlines={showGridlines}
            showPeriodHigh={showPeriodHigh}
            showPeriodLow={showPeriodLow}
            periodWeeks={periodWeeks}
            onCrosshairMove={handleCrosshairMove}
            indicators={indicators}
          />
        </div>

        {/* Loading Overlay */}
        {dataManager.isUpdating && (
          <div className='absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center'>
            <Loading size='lg' text='Updating chart data...' />
          </div>
        )}

        {/* Drawing Context Menu */}
        {drawingManager.drawingTools.contextMenu.isVisible &&
          drawingManager.drawingTools.contextMenu.targetToolId && (
            <DrawingContextMenu
              x={drawingManager.drawingTools.contextMenu.x}
              y={drawingManager.drawingTools.contextMenu.y}
              tool={
                drawingManager.drawingTools.getTool(
                  drawingManager.drawingTools.contextMenu.targetToolId
                )!
              }
              onClose={drawingManager.drawingTools.hideContextMenu}
              onChangeColor={color =>
                drawingManager.changeDrawingToolColor(
                  drawingManager.drawingTools.contextMenu.targetToolId!,
                  color
                )
              }
              onDelete={() =>
                drawingManager.deleteDrawingTool(
                  drawingManager.drawingTools.contextMenu.targetToolId!
                )
              }
              onDuplicate={() =>
                drawingManager.duplicateDrawingTool(
                  drawingManager.drawingTools.contextMenu.targetToolId!
                )
              }
            />
          )}
      </div>
    )
  }
)

ChartContainer.displayName = 'ChartContainer'

export default ChartContainer
