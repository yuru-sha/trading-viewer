import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Loading } from '@trading-viewer/ui'
import EChartsTradingChart from './EChartsTradingChart'
import LeftDrawingToolbar, { LeftDrawingToolbarRef } from './LeftDrawingToolbar'
import DrawingContextMenu from './DrawingContextMenu'
import { PriceData } from '../../utils/indicators'
import useDrawingToolsWithServerPersistence from '../../hooks/drawing/useDrawingToolsWithServerPersistence'
import { DrawingTool } from './DrawingToolsPanel'
import { DrawingToolType } from '@trading-viewer/shared'
import { DrawingObject } from './DrawingObjectsPanel'

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
    },
    ref
  ) => {
    const [settings] = useState(defaultSettings)
    const drawingTools = useDrawingToolsWithServerPersistence({
      symbol,
      timeframe,
      autoSave: true,
      autoSaveInterval: 1000, // 1 秒後に自動保存
    })

    // Chart instance ref to access chart functionality
    const chartRef = React.useRef<any>(null)

    // Drawing toolbar ref to close objects panel
    const drawingToolbarRef = React.useRef<LeftDrawingToolbarRef>(null)

    // Expose takeScreenshot method through ref
    useImperativeHandle(
      ref,
      () => ({
        takeScreenshot: (filename?: string) => {
          if (chartRef.current?.takeScreenshot) {
            return chartRef.current.takeScreenshot(filename)
          } else {
            console.warn('Chart instance not available for screenshot')
            return null
          }
        },
      }),
      []
    )

    // Chart objects state (Price Chart is excluded from objects list as it's always the main chart)
    const [chartObjects, setChartObjects] = useState<DrawingObject[]>([
      {
        id: 'volume',
        name: 'Volume',
        type: 'vertical', // Temporary type for volume, should be adjusted based on actual needs
        visible: settings.showVolume,
        color: '#6366f1',
        createdAt: Date.now(),
      },
    ])

    // Handle object visibility toggle
    const handleToggleObjectVisibility = useCallback((id: string) => {
      setChartObjects(prev =>
        prev.map(obj => (obj.id === id ? { ...obj, visible: !obj.visible } : obj))
      )
    }, [])

    // Handle object removal
    const handleRemoveObject = useCallback((id: string) => {
      setChartObjects(prev => prev.filter(obj => obj.id !== id))
    }, [])

    // Handle drawing tool context menu actions
    const handleChangeDrawingToolColor = useCallback(
      (toolId: string, color: string) => {
        console.log('🎯 Changing drawing tool color:', toolId, color)
        const tool = drawingTools.getTool(toolId)
        if (tool) {
          drawingTools.updateTool(toolId, {
            style: {
              ...tool.style,
              color,
            },
          })
        }
      },
      [drawingTools]
    )

    const handleToggleDrawingToolVisibility = useCallback(
      (toolId: string) => {
        console.log('🎯 Toggling drawing tool visibility:', toolId)
        const tool = drawingTools.getTool(toolId)
        if (tool) {
          drawingTools.updateTool(toolId, { visible: !(tool.visible ?? true) })
        }
      },
      [drawingTools]
    )

    const handleDeleteDrawingTool = useCallback(
      (toolId: string) => {
        console.log('🎯 Deleting drawing tool:', toolId)
        drawingTools.deleteTool(toolId)
        drawingTools.hideContextMenu()
      },
      [drawingTools]
    )

    const handleDuplicateDrawingTool = useCallback(
      (toolId: string) => {
        console.log('🎯 Duplicating drawing tool:', toolId)
        drawingTools.duplicateTool(toolId)
        drawingTools.hideContextMenu()
      },
      [drawingTools]
    )

    if (isLoading && !data.length) {
      return (
        <div
          className={`flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg border ${className}`}
        >
          <Loading size='lg' text='Loading chart data...' />
        </div>
      )
    }

    if (!data.length) {
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
        {(showDrawingTools ?? settings.showDrawingTools) && (
          <LeftDrawingToolbar
            ref={drawingToolbarRef}
            activeTool={drawingTools.activeToolType}
            onToolSelect={(toolType: DrawingToolType | null) => {
              console.log('🔧 ChartContainer - Tool selected:', toolType)
              console.log('🔧 Drawing tools state before setToolType:', {
                activeToolType: drawingTools.activeToolType,
                drawingMode: drawingTools.drawingMode,
                canDraw: drawingTools.canDraw,
                isDrawing: drawingTools.isDrawing,
              })
              drawingTools.setToolType(toolType)

              // 状態更新後の確認は次のレンダリングサイクルで行う
              setTimeout(() => {
                console.log('🔧 Drawing tools state after setToolType (next tick):', {
                  activeToolType: drawingTools.activeToolType,
                  drawingMode: drawingTools.drawingMode,
                  canDraw: drawingTools.canDraw,
                  isDrawing: drawingTools.isDrawing,
                })
              }, 0)
            }}
            objects={drawingTools.tools.map(tool => ({
              id: tool.id,
              name: `${tool.type.charAt(0).toUpperCase() + tool.type.slice(1)} ${tool.id.slice(-4)}`,
              type: tool.type,
              visible: tool.visible ?? true,
              color: tool.style?.color || '#3b82f6',
              createdAt: tool.createdAt || Date.now(),
            }))}
            onToggleObjectVisibility={handleToggleDrawingToolVisibility}
            onRemoveObject={handleDeleteDrawingTool}
            onChangeObjectColor={handleChangeDrawingToolColor}
            className=''
          />
        )}

        {/* Main Chart Area - Full height */}
        <div className='flex-1 min-w-0'>
          <EChartsTradingChart
            ref={chartRef}
            onChartClick={() => {
              // Close Drawing Objects panel when chart is clicked
              if (drawingToolbarRef.current) {
                drawingToolbarRef.current.closeObjectsPanel()
              }
            }}
            data={data}
            currentPrice={currentPrice}
            showVolume={
              chartObjects.find(obj => obj.id === 'volume')?.visible ?? settings.showVolume
            }
            className='h-full'
            enableDrawingTools={showDrawingTools ?? settings.showDrawingTools}
            drawingTools={drawingTools}
            symbol={symbol}
            chartType={chartType}
            timeframe={timeframe}
            showGridlines={showGridlines}
            showPeriodHigh={showPeriodHigh}
            showPeriodLow={showPeriodLow}
            periodWeeks={periodWeeks}
            onCrosshairMove={(price, time) => {
              // カーソル位置の価格表示を復活させる
              // 必要に応じてここで価格表示の処理を行う
            }}
          />
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className='absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center'>
            <Loading size='lg' text='Updating chart data...' />
          </div>
        )}

        {/* Drawing Context Menu */}
        {drawingTools.contextMenu.isVisible && drawingTools.contextMenu.targetToolId && (
          <DrawingContextMenu
            x={drawingTools.contextMenu.x}
            y={drawingTools.contextMenu.y}
            tool={drawingTools.getTool(drawingTools.contextMenu.targetToolId)!}
            onClose={drawingTools.hideContextMenu}
            onChangeColor={color =>
              handleChangeDrawingToolColor(drawingTools.contextMenu.targetToolId!, color)
            }
            onDelete={() => handleDeleteDrawingTool(drawingTools.contextMenu.targetToolId!)}
            onDuplicate={() => handleDuplicateDrawingTool(drawingTools.contextMenu.targetToolId!)}
          />
        )}
      </div>
    )
  }
)

ChartContainer.displayName = 'ChartContainer'

export default ChartContainer
