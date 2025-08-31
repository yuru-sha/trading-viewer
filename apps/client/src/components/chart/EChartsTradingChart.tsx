import React, { useEffect, forwardRef, useImperativeHandle } from 'react'
import ReactECharts from 'echarts-for-react'
import { GraphicComponentOption } from 'echarts/components'
import { useApp } from '../../contexts/AppContext'
import { PriceData } from '../../utils/indicators'
import { getCompanyName } from '../../data/symbolMapping'
import type useDrawingTools from '../../hooks/useDrawingTools'
import { useChartInstance } from '../../hooks/useChartInstance'
import { useChartData } from '../../hooks/useChartData'
import { useChartEvents } from '../../hooks/useChartEvents'
import { useChartOptions } from '../../hooks/useChartOptions'
import { UserIndicator, DrawingTool } from '@trading-viewer/shared'
import { log } from '../../services/logger'

export interface EChartsTradingChartRef {
  takeScreenshot: (filename?: string) => void
}

export interface EChartsTradingChartProps {
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
  onChartClick?: () => void
  indicators?: UserIndicator[]
  colors?: {
    bullish: string
    bearish: string
    volume: string
    grid: string
    background: string
  }
}

export const EChartsTradingChart = forwardRef<EChartsTradingChartRef, EChartsTradingChartProps>(
  (
    {
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
      onChartClick,
      indicators = [],
      colors,
    },
    ref
  ) => {
    const { state } = useApp()

    // Phase 1 リファクタリング: 専用フックによる責任分離
    const chartInstance = useChartInstance()

    // Expose takeScreenshot method through ref
    useImperativeHandle(
      ref,
      () => ({
        takeScreenshot: chartInstance.takeScreenshot,
      }),
      [chartInstance.takeScreenshot]
    )
    const { chartData, priceStats } = useChartData(data, chartType, timeframe, periodWeeks)

    // Chart events handled internally by the hook
    useChartEvents(chartInstance, drawingTools, {
      enableDrawingTools,
      onCrosshairMove,
      onChartClick,
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
      timeframe,
      currentPrice,
      graphicElements: generateGraphicElements(),
      showPeriodHigh,
      showPeriodLow,
      indicators,
      colors,
    })

    // Helper function to find closest data index by timestamp
    function findClosestDataIndex(targetTimestamp: number): number {
      if (data.length === 0) return -1

      // First try exact match
      const exactIndex = data.findIndex(d => d.timestamp === targetTimestamp)
      if (exactIndex !== -1) return exactIndex

      // Find closest timestamp
      let closestIndex = 0
      let minDiff = Math.abs(data[0].timestamp - targetTimestamp)

      for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].timestamp - targetTimestamp)
        if (diff < minDiff) {
          minDiff = diff
          closestIndex = i
        }
      }

      return closestIndex
    }

    // 描画ツールのグラフィック要素生成
    function generateGraphicElements() {
      if (!drawingTools || !chartInstance.chartReady) {
        return []
      }

      const elements: GraphicComponentOption[] = []
      const visibleTools = drawingTools.tools.filter(tool => tool.visible !== false)

      // プレビュー描画を表示（描画中の場合）
      // 描画ツールが有効で、かつ描画中の場合のみプレビューを表示
      if (
        enableDrawingTools &&
        drawingTools.isDrawing &&
        drawingTools.currentDrawing &&
        chartInstance.chartRef.current
      ) {
        const currentTool = drawingTools.currentDrawing

        if (
          (currentTool.type === 'trendline' || currentTool.type === 'fibonacci') &&
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
                // Trendline プレビュー
                if (currentTool.type === 'trendline') {
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

                // Fibonacci プレビュー（フィボナッチレベルを表示）
                else if (currentTool.type === 'fibonacci') {
                  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
                  const startPrice = startPoint.price
                  const endPrice = endPoint.price
                  const priceRange = endPrice - startPrice

                  // 始点から終点+20% の範囲でプレビューライン制限
                  const previewStartX = Math.min(startPixel[0], endPixel[0])
                  const previewEndX =
                    Math.max(startPixel[0], endPixel[0]) +
                    Math.abs(startPixel[0] - endPixel[0]) * 0.2

                  fibLevels.forEach((level, index) => {
                    const levelPrice = startPrice + priceRange * level
                    const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

                    if (levelPixel && Array.isArray(levelPixel)) {
                      // プレビューのフィボナッチレベル線
                      elements.push({
                        type: 'line',
                        id: `${currentTool.id}_preview_fib_${level}`,
                        shape: {
                          x1: previewStartX,
                          y1: levelPixel[1],
                          x2: previewEndX,
                          y2: levelPixel[1],
                        },
                        style: {
                          stroke: '#ff6b35',
                          lineWidth: index === 0 || index === fibLevels.length - 1 ? 3 : 1,
                          opacity: 0.7,
                          lineDash: index === 3 ? [] : [2, 2],
                        },
                      })

                      // プレビューのラベル
                      elements.push({
                        type: 'text',
                        id: `${currentTool.id}_preview_label_${level}`,
                        position: [previewEndX - 5, levelPixel[1] - 8],
                        style: {
                          text: `${(level * 100).toFixed(1)}%`,
                          fontSize: 9,
                          fill: '#ff6b35',
                        },
                      })
                    }
                  })
                }
              }
            }
          } catch (error) {
            log.business.error('Failed to convert coordinates for drawing tool preview', error, {
              operation: 'drawing_preview',
              toolType: currentTool.type,
              toolId: currentTool.id,
            })
          }
        }
      }

      // 完成した描画ツールを表示
      visibleTools.forEach((tool: DrawingTool) => {
        if (chartInstance.chartRef.current) {
          const chart = chartInstance.chartRef.current.getEchartsInstance()
          if (!chart) return

          // 選択中のツールかどうか判定
          const isSelected = drawingTools?.selectedToolId === tool.id

          try {
            // Trendline の処理
            if (tool.type === 'trendline' && tool.points && tool.points.length >= 2) {
              const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
              const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)

              // Skip rendering if data is empty
              if (startDataIndex === -1 || endDataIndex === -1) {
                log.business.warn('Trendline points not found in current chart data', {
                  operation: 'render_trendline',
                  toolId: tool.id,
                  startDataIndex,
                  endDataIndex,
                  dataLength: data.length,
                })
                return
              }

              const startPixel = chart.convertToPixel('grid', [
                startDataIndex,
                tool.points[0].price,
              ])
              const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

              if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
                // メインのライン
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
                    lineWidth: isSelected
                      ? (tool.style?.thickness || 2) + 2
                      : tool.style?.thickness || 2,
                    opacity: tool.style?.opacity || 1,
                    shadowBlur: isSelected ? 8 : 0,
                    shadowColor: tool.style?.color || '#3b82f6',
                  },
                  z: isSelected ? 150 : 100,
                })

                // 選択中の場合、端点にハンドルを表示
                if (isSelected) {
                  // 始点ハンドル
                  elements.push({
                    type: 'circle',
                    id: `${tool.id}_handle_start`,
                    shape: {
                      cx: startPixel[0],
                      cy: startPixel[1],
                      r: 6,
                    },
                    style: {
                      fill: '#ffffff',
                      stroke: tool.style?.color || '#3b82f6',
                      lineWidth: 2,
                    },
                    z: 151,
                    cursor: 'move',
                    // Add data attributes for drag detection
                    $action: 'replace',
                    info: {
                      isHandle: true,
                      toolId: tool.id,
                      handleType: 'start',
                    },
                  })

                  // 終点ハンドル
                  elements.push({
                    type: 'circle',
                    id: `${tool.id}_handle_end`,
                    shape: {
                      cx: endPixel[0],
                      cy: endPixel[1],
                      r: 6,
                    },
                    style: {
                      fill: '#ffffff',
                      stroke: tool.style?.color || '#3b82f6',
                      lineWidth: 2,
                    },
                    z: 151,
                    cursor: 'move',
                    // Add data attributes for drag detection
                    $action: 'replace',
                    info: {
                      isHandle: true,
                      toolId: tool.id,
                      handleType: 'end',
                    },
                  })
                }
              }
            }

            // Horizontal Line の処理（チャート全幅に水平線を描画）
            else if (tool.type === 'horizontal' && tool.points && tool.points.length >= 1) {
              const dataIndex = findClosestDataIndex(tool.points[0].timestamp)
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
                    lineWidth: isSelected
                      ? (tool.style?.thickness || 2) + 2
                      : tool.style?.thickness || 2,
                    opacity: tool.style?.opacity || 1,
                    shadowBlur: isSelected ? 8 : 0,
                    shadowColor: tool.style?.color || '#ef4444',
                  },
                  z: isSelected ? 150 : 100,
                })
              }
            }

            // Vertical Line の処理（チャート全高に垂直線を描画）
            else if (tool.type === 'vertical' && tool.points && tool.points.length >= 1) {
              const dataIndex = findClosestDataIndex(tool.points[0].timestamp)
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
                    lineWidth: isSelected
                      ? (tool.style?.thickness || 2) + 2
                      : tool.style?.thickness || 2,
                    opacity: tool.style?.opacity || 1,
                    shadowBlur: isSelected ? 8 : 0,
                    shadowColor: tool.style?.color || '#10b981',
                  },
                  z: isSelected ? 150 : 100,
                })
              }
            }

            // Fibonacci Retracement の処理（複数のリトレースメントレベルを描画）
            else if (tool.type === 'fibonacci' && tool.points && tool.points.length >= 2) {
              const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
              const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)

              // Skip rendering if data is empty
              if (startDataIndex === -1 || endDataIndex === -1) {
                log.business.warn('Fibonacci retracement points not found in current chart data', {
                  operation: 'render_fibonacci',
                  toolId: tool.id,
                  startDataIndex,
                  endDataIndex,
                  dataLength: data.length,
                })
                return
              }

              const startPixel = chart.convertToPixel('grid', [
                startDataIndex,
                tool.points[0].price,
              ])
              const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

              if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
                // フィボナッチリトレースメントレベル
                const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
                const startPrice = tool.points[0].price
                const endPrice = tool.points[1].price
                const priceRange = endPrice - startPrice

                fibLevels.forEach((level, index) => {
                  const levelPrice = startPrice + priceRange * level
                  const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

                  if (levelPixel && Array.isArray(levelPixel)) {
                    // 始点から終点+20% の範囲でラインを制限（ごちゃごちゃしないように）
                    const lineStartX = Math.min(startPixel[0], endPixel[0])
                    const lineEndX =
                      Math.max(startPixel[0], endPixel[0]) +
                      Math.abs(startPixel[0] - endPixel[0]) * 0.2

                    // レベル線を描画（制限された範囲で）
                    elements.push({
                      type: 'line',
                      id: `${tool.id}_fib_${level}`,
                      shape: {
                        x1: lineStartX,
                        y1: levelPixel[1],
                        x2: lineEndX,
                        y2: levelPixel[1],
                      },
                      style: {
                        stroke: tool.style?.color || '#f59e0b',
                        lineWidth: isSelected
                          ? index === 0 || index === fibLevels.length - 1
                            ? 4
                            : 3 // Selected: 0%/100% are thicker
                          : index === 0 || index === fibLevels.length - 1
                            ? 2
                            : 1, // Normal: 0%/100% are thicker
                        opacity: tool.style?.opacity || 0.8,
                        lineDash: index === 3 ? [] : [4, 4], // 50% レベルは実線、他は破線
                        shadowBlur: isSelected ? 4 : 0,
                        shadowColor: tool.style?.color || '#f59e0b',
                      },
                      z: isSelected ? 150 : 100,
                    })

                    // レベルラベルを表示（ライン終端近くに配置）
                    elements.push({
                      type: 'text',
                      id: `${tool.id}_fib_label_${level}`,
                      position: [lineEndX - 5, levelPixel[1] - 8],
                      style: {
                        text: `${(level * 100).toFixed(1)}% (${levelPrice.toFixed(2)})`,
                        fontSize: 10,
                        fill: tool.style?.color || '#f59e0b',
                      },
                      z: 101,
                    })
                  }
                })

                // 選択中の場合、開始点と終了点にハンドルを表示
                if (isSelected) {
                  // 始点ハンドル
                  elements.push({
                    type: 'circle',
                    id: `${tool.id}_handle_start`,
                    shape: {
                      cx: startPixel[0],
                      cy: startPixel[1],
                      r: 6,
                    },
                    style: {
                      fill: '#ffffff',
                      stroke: tool.style?.color || '#f59e0b',
                      lineWidth: 2,
                    },
                    z: 151,
                    cursor: 'move',
                    $action: 'replace',
                    info: {
                      isHandle: true,
                      toolId: tool.id,
                      handleType: 'start',
                    },
                  })

                  // 終点ハンドル
                  elements.push({
                    type: 'circle',
                    id: `${tool.id}_handle_end`,
                    shape: {
                      cx: endPixel[0],
                      cy: endPixel[1],
                      r: 6,
                    },
                    style: {
                      fill: '#ffffff',
                      stroke: tool.style?.color || '#f59e0b',
                      lineWidth: 2,
                    },
                    z: 151,
                    cursor: 'move',
                    $action: 'replace',
                    info: {
                      isHandle: true,
                      toolId: tool.id,
                      handleType: 'end',
                    },
                  })
                }
              }
            }
          } catch (error) {
            log.business.error('Failed to convert coordinates for drawing tool', error, {
              operation: 'render_drawing_tool',
              toolType: tool.type,
              toolId: tool.id,
            })
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
          <div className='absolute top-3 left-3 z-10 bg-white bg-opacity-95 dark:bg-black dark:bg-opacity-50 text-gray-800 dark:text-white px-3 py-2 rounded text-xs shadow-lg'>
            <div className='flex space-x-4'>
              <span className='font-semibold'>{getCompanyName(symbol || '')}</span>
              <span>O: {priceStats.open.toFixed(2)}</span>
              <span>H: {priceStats.high.toFixed(2)}</span>
              <span>L: {priceStats.low.toFixed(2)}</span>
              <span>C: {priceStats.close.toFixed(2)}</span>
              <span
                className={
                  priceStats.change >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
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
  }
)

EChartsTradingChart.displayName = 'EChartsTradingChart'

export default EChartsTradingChart
