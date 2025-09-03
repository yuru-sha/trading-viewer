import React, { useCallback, forwardRef, useImperativeHandle, useMemo } from 'react'
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

interface ChartContainerProps {
  symbol: string
  data: PriceData[]
  currentPrice?: number
  isLoading?: boolean
  isRealTime?: boolean
  className?: string
  chartType?: 'candle' | 'line' | 'area'
  timeframe?: string
  showGridlines?: boolean
  showDrawingTools?: boolean
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
  periodWeeks?: number
  showVolume?: boolean
  colors?: {
    bullish: string
    bearish: string
    volume: string
    grid: string
    background: string
  }
}

const defaultSettings = {
  showVolume: true,
  showDrawingTools: true, // デフォルトで描画ツールを表示
}

// チャートコンテナの ref のインターフェース
export interface ChartContainerRef {
  takeScreenshot: (filename?: string) => void
}

const ChartContainerComponent = forwardRef<ChartContainerRef, ChartContainerProps>(
  (
    {
      symbol,
      data,
      currentPrice,
      isLoading = false,
      isRealTime = false,
      className = '',
      chartType = 'candle',
      timeframe,
      showGridlines = true,
      showDrawingTools,
      showPeriodHigh = true,
      showPeriodLow = true,
      periodWeeks = 52,
      showVolume = true,
      colors,
    },
    ref
  ) => {
    // フックの依存関係をメモ化して不要な再レンダリングを防止
    const dataManagerConfig = useMemo(
      () => ({
        symbol,
        data,
        currentPrice,
        isLoading,
        isRealTime,
      }),
      [symbol, data, currentPrice, isLoading, isRealTime]
    )

    const renderingConfig = useMemo(
      () => ({
        showDrawingTools: showDrawingTools ?? defaultSettings.showDrawingTools,
      }),
      [showDrawingTools]
    )

    const drawingConfig = useMemo(
      () => ({
        symbol,
        timeframe,
        autoSave: true,
        autoSaveInterval: 1000,
      }),
      [symbol, timeframe]
    )

    // カスタムフックを使用して関心を分離
    const dataManager = useChartDataManager(dataManagerConfig)
    const renderingManager = useChartRendering(renderingConfig)
    const drawingManager = useChartDrawingManager(drawingConfig)

    // 現在の銘柄とタイムフレームのインジケーターを取得
    const { data: indicators = [] } = useIndicators(symbol, timeframe)

    // オブジェクトパネルを閉じるための描画ツールバーの ref
    const drawingToolbarRef = React.useRef<LeftDrawingToolbarRef>(null)

    // ref 経由で takeScreenshot メソッドを公開
    useImperativeHandle(
      ref,
      () => ({
        takeScreenshot: renderingManager.takeScreenshot,
      }),
      [renderingManager.takeScreenshot]
    )

    // 描画ツールの選択を処理
    const handleToolSelect = useCallback(
      (toolType: DrawingToolType | null) => {
        drawingManager.drawingTools.setToolType(toolType)
      },
      [drawingManager.drawingTools]
    )

    // チャートクリックでパネルを閉じる
    const handleChartClick = useCallback(() => {
      if (drawingToolbarRef.current) {
        drawingToolbarRef.current.closeObjectsPanel()
      }
    }, [])

    // 十字カーソルの移動を処理
    const handleCrosshairMove = useCallback((_price: number | null, _time: number | null) => {
      // カーソル位置の価格表示
      // 必要に応じてここで価格表示の処理を行う
    }, [])

    // ローディング中とデータなしの状態の場合は早期リターン
    if (dataManager.isInitialLoading) {
      return (
        <div
          className={`flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg border ${className}`}
        >
          <Loading size='lg' text='チャートデータを読み込み中...' />
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
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
            チャートデータがありません
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400 text-center max-w-md'>
            {symbol}{' '}
            の価格データがありません。この銘柄はサポートされていないか、市場データが一時的に利用できない可能性があります。
          </p>
        </div>
      )
    }

    return (
      <div className={`h-full flex relative ${className}`} data-testid='chart-container'>
        {/* 左側の描画ツールバー */}
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

        {/* メインチャートエリア - 全画面表示 */}
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
            colors={colors}
          />
        </div>

        {/* ローディングオーバーレイ */}
        {dataManager.isUpdating && (
          <div className='absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center'>
            <Loading size='lg' text='チャートデータを更新中...' />
          </div>
        )}

        {/* 描画コンテキストメニュー */}
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

ChartContainerComponent.displayName = 'ChartContainer'

// パフォーマンス向上のためコンポーネントをメモ化
export const ChartContainer = React.memo(ChartContainerComponent, (prevProps, nextProps) => {
  // パフォーマンス向上のためのカスタム比較ロジック
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.data === nextProps.data &&
    prevProps.currentPrice === nextProps.currentPrice &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isRealTime === nextProps.isRealTime &&
    prevProps.chartType === nextProps.chartType &&
    prevProps.timeframe === nextProps.timeframe &&
    prevProps.showDrawingTools === nextProps.showDrawingTools &&
    prevProps.showVolume === nextProps.showVolume &&
    prevProps.showGridlines === nextProps.showGridlines &&
    prevProps.showPeriodHigh === nextProps.showPeriodHigh &&
    prevProps.showPeriodLow === nextProps.showPeriodLow &&
    prevProps.periodWeeks === nextProps.periodWeeks
  )
})

export default ChartContainer
