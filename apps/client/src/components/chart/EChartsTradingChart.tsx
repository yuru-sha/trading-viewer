import React, { useEffect, forwardRef, useImperativeHandle } from 'react'
import ReactECharts from 'echarts-for-react'
import { useApp } from '../../contexts/AppContext'
import { PriceData } from '../../utils/indicators'
import { getCompanyName } from '../../data/symbolMapping'
import type useDrawingTools from '../../hooks/useDrawingTools'
import { useChartInstance } from '../../hooks/useChartInstance'
import { useChartData } from '../../hooks/useChartData'
import { useChartEvents } from '../../hooks/useChartEvents'
import { useChartOptions } from '../../hooks/useChartOptions'

interface EChartsTradingChartProps {
  data: PriceData[]
  width?: number
  height?: number
  showVolume?: boolean
  currentPrice?: number
  className?: string
  onCrosshairMove?: (price: number | null, time: number | null) => void
  symbol?: string
  chartType?: 'candle' | 'line' | 'area'
  enableDrawingTools?: boolean
  drawingTools?: ReturnType<typeof useDrawingTools>
  timeframe?: string
  showGridlines?: boolean
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
  periodWeeks?: number
}

export const EChartsTradingChart = forwardRef<any, EChartsTradingChartProps>(({
  data,
  width,
  height,
  showVolume = true,
  currentPrice,
  className = '',
  onCrosshairMove,
  symbol,
  chartType = 'candle',
  enableDrawingTools = false,
  drawingTools,
  timeframe,
  showGridlines = true,
  showPeriodHigh = true,
  showPeriodLow = true,
  periodWeeks = 52,
}, ref) => {
  const { state } = useApp()

  // Phase 1 リファクタリング: 専用フックによる責任分離
  const chartInstance = useChartInstance()

  // Expose takeScreenshot method through ref
  useImperativeHandle(ref, () => ({
    takeScreenshot: chartInstance.takeScreenshot
  }), [chartInstance.takeScreenshot])
  const { chartData, priceStats } = useChartData(data, chartType, timeframe, periodWeeks)

  // Chart events handled internally by the hook
  useChartEvents(chartInstance, drawingTools, {
    enableDrawingTools,
    onCrosshairMove,
    data,
  })

  const { option } = useChartOptions(chartData, priceStats, {
    chartType,
    showVolume,
    showGridlines,
    enableDrawingTools,
    activeDrawingTool: drawingTools?.activeToolType,
    theme: state.theme,
    symbol,
    currentPrice,
    graphicElements: generateGraphicElements(),
    showPeriodHigh,
    showPeriodLow,
  })

  // 描画ツールのグラフィック要素生成
  function generateGraphicElements() {
    if (!drawingTools || !chartInstance.chartReady) {
      return []
    }

    const elements: any[] = []
    const visibleTools = drawingTools.visibleTools || []

    // プレビュー描画を表示（描画中の場合）
    // 描画ツールが有効で、かつ描画中の場合のみプレビューを表示
    if (enableDrawingTools && drawingTools.isDrawing && drawingTools.currentDrawing && chartInstance.chartRef.current) {
      const currentTool = drawingTools.currentDrawing

      if (
        currentTool.type === 'trendline' &&
        currentTool.points &&
        currentTool.points.length >= 1
      ) {
        const chart = chartInstance.chartRef.current.getEchartsInstance()
        if (!chart) {
          return elements
        }

        try {
          const startPoint = currentTool.points[0]
          const startDataIndex = data.findIndex(d => d.timestamp === startPoint.timestamp)
          const startPixel = chart.convertToPixel('grid', [startDataIndex, startPoint.price])

          // 描画中は始点マーカーを表示
          if (startPixel) {
            elements.push({
              type: 'circle',
              id: `${currentTool.id}_start_point`,
              shape: {
                cx: startPixel[0],
                cy: startPixel[1],
                r: 8,
              },
              style: {
                fill: '#ff6b35',
                stroke: '#ffffff',
                lineWidth: 3,
                opacity: 1,
              },
            })
          }

          // 2 点目があるプレビューライン
          if (currentTool.points.length >= 2) {
            const endPoint = currentTool.points[1]
            const endDataIndex = data.findIndex(d => d.timestamp === endPoint.timestamp)
            const endPixel = chart.convertToPixel('grid', [endDataIndex, endPoint.price])

            if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
              elements.push({
                type: 'line',
                id: `${currentTool.id}_preview`,
                shape: {
                  x1: startPixel[0],
                  y1: startPixel[1],
                  x2: endPixel[0],
                  y2: endPixel[1],
                },
                style: {
                  stroke: '#ff6b35',
                  lineWidth: 5,
                  opacity: 1,
                  lineDash: null,
                },
              })
            }
          }
        } catch (error) {
          console.error('🎨 Failed to convert coordinates for preview:', error)
        }
      }
    }

    // 完成した描画ツールを表示
    visibleTools.forEach((tool: any) => {
      if (chartInstance.chartRef.current) {
        const chart = chartInstance.chartRef.current.getEchartsInstance()
        if (!chart) return

        try {
          // Trendline の処理
          if (tool.type === 'trendline' && tool.points && tool.points.length >= 2) {
            const startDataIndex = data.findIndex(d => d.timestamp === tool.points[0].timestamp)
            const endDataIndex = data.findIndex(d => d.timestamp === tool.points[1].timestamp)

            const startPixel = chart.convertToPixel('grid', [startDataIndex, tool.points[0].price])
            const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

            if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
              elements.push({
                type: 'line',
                id: tool.id,
                shape: {
                  x1: startPixel[0],
                  y1: startPixel[1],
                  x2: endPixel[0],
                  y2: endPixel[1],
                },
                style: {
                  stroke: tool.style?.color || '#3b82f6',
                  lineWidth: tool.style?.thickness || 2,
                  opacity: tool.style?.opacity || 1,
                },
                z: 100,
              })
            }
          }
          
          // Horizontal Line の処理（チャート全幅に水平線を描画）
          else if (tool.type === 'horizontal' && tool.points && tool.points.length >= 1) {
            const dataIndex = data.findIndex(d => d.timestamp === tool.points[0].timestamp)
            const centerPixel = chart.convertToPixel('grid', [dataIndex, tool.points[0].price])
            
            if (centerPixel && Array.isArray(centerPixel)) {
              // チャートの左右端を取得
              const gridRect = chart.getModel().getComponent('grid', 0).coordinateSystem.getRect()
              const leftPixel = gridRect.x
              const rightPixel = gridRect.x + gridRect.width
              
              elements.push({
                type: 'line',
                id: tool.id,
                shape: {
                  x1: leftPixel,
                  y1: centerPixel[1],
                  x2: rightPixel,
                  y2: centerPixel[1],
                },
                style: {
                  stroke: tool.style?.color || '#ef4444',
                  lineWidth: tool.style?.thickness || 2,
                  opacity: tool.style?.opacity || 1,
                },
                z: 100,
              })
            }
          }
          
          // Vertical Line の処理（チャート全高に垂直線を描画）
          else if (tool.type === 'vertical' && tool.points && tool.points.length >= 1) {
            const dataIndex = data.findIndex(d => d.timestamp === tool.points[0].timestamp)
            const centerPixel = chart.convertToPixel('grid', [dataIndex, tool.points[0].price])
            
            if (centerPixel && Array.isArray(centerPixel)) {
              // チャートの上下端を取得
              const gridRect = chart.getModel().getComponent('grid', 0).coordinateSystem.getRect()
              const topPixel = gridRect.y
              const bottomPixel = gridRect.y + gridRect.height
              
              elements.push({
                type: 'line',
                id: tool.id,
                shape: {
                  x1: centerPixel[0],
                  y1: topPixel,
                  x2: centerPixel[0],
                  y2: bottomPixel,
                },
                style: {
                  stroke: tool.style?.color || '#10b981',
                  lineWidth: tool.style?.thickness || 2,
                  opacity: tool.style?.opacity || 1,
                },
                z: 100,
              })
            }
          }
          
        } catch (error) {
          console.error(`🎨 Failed to convert coordinates for ${tool.type}:`, error)
        }
      }
    })

    return elements
  }

  // キーボードイベント処理（描画ツール用）
  useEffect(() => {
    if (!enableDrawingTools || !drawingTools) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (drawingTools.selectedToolId) {
          drawingTools.deleteTool(drawingTools.selectedToolId)
          event.preventDefault()
        }
      } else if (event.key === 'Escape') {
        if (drawingTools.isDrawing) {
          drawingTools.cancelDrawing()
        } else {
          drawingTools.selectTool(null)
        }
        event.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableDrawingTools, drawingTools])

  return (
    <div className={`relative ${className}`}>
      {priceStats && (
        <div className='absolute top-3 left-3 z-10 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-xs'>
          <div className='flex space-x-4'>
            <span className='font-semibold'>{getCompanyName(symbol || '')}</span>
            <span>O: {priceStats.open.toFixed(2)}</span>
            <span>H: {priceStats.high.toFixed(2)}</span>
            <span>L: {priceStats.low.toFixed(2)}</span>
            <span>C: {priceStats.close.toFixed(2)}</span>
            <span className={priceStats.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {priceStats.change >= 0 ? '+' : ''}
              {priceStats.change.toFixed(2)} ({priceStats.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}
      <ReactECharts
        ref={chartInstance.chartRef}
        option={option}
        style={{
          width: width || '100%',
          height: height || '100%',
        }}
        opts={{
          renderer: 'canvas',
          resize: true, // 自動リサイズを有効化
        }}
        onChartReady={chartInstance.onChartReady}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  )
})

EChartsTradingChart.displayName = 'EChartsTradingChart'

export default EChartsTradingChart
