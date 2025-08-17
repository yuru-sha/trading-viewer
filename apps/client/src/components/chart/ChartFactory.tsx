import React from 'react'
import { IChartComponent, IChartFactory, ChartType, ChartConfig, ChartState } from '@shared'
import { MarketData } from '@shared'
import OptimizedChartContainer from './OptimizedChartContainer'
import { LazyEChartsTradingChart } from './LazyEChartsWrapper'
import { PriceData } from '../../utils/indicators'

/**
 * OptimizedChartContainer 用のアダプター
 * IChartComponent インターフェースを実装
 */
class OptimizedChartAdapter implements IChartComponent {
  private config: ChartConfig
  private state: ChartState
  private data: PriceData[] = []
  private containerRef: React.RefObject<any>

  constructor(config: ChartConfig) {
    this.config = config
    this.state = {
      isLoading: false,
      hasData: false,
      lastUpdate: null,
      error: null,
    }
    this.containerRef = React.createRef()
  }

  render(): JSX.Element {
    return (
      <OptimizedChartContainer
        ref={this.containerRef}
        symbol='AAPL' // TODO: 設定から取得
        data={this.data}
        isLoading={this.state.isLoading}
        chartType={this.config.theme === 'dark' ? 'candle' : 'candle'}
        timeframe={this.config.timeframe || '1D'}
        showDrawingTools={this.config.drawingTools}
        className='w-full h-full'
      />
    )
  }

  updateData(data: MarketData): void {
    // MarketData を PriceData に変換
    const priceData: PriceData = {
      timestamp: data.timestamp,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.volume || 0,
    }

    this.data = [...this.data, priceData]
    this.state = {
      ...this.state,
      hasData: true,
      lastUpdate: new Date(),
    }
  }

  cleanup(): void {
    this.data = []
    this.state = {
      isLoading: false,
      hasData: false,
      lastUpdate: null,
      error: null,
    }
  }

  resize?(width: number, height: number): void {
    // OptimizedChartContainer は auto-resize に対応しているため、
    // 特別な処理は不要
  }

  updateConfig?(config: ChartConfig): void {
    this.config = { ...this.config, ...config }
  }

  getState?(): ChartState {
    return { ...this.state }
  }
}

/**
 * EChartsTradingChart 用のアダプター
 */
class EChartsAdapter implements IChartComponent {
  private config: ChartConfig
  private state: ChartState
  private data: any[] = []

  constructor(config: ChartConfig) {
    this.config = config
    this.state = {
      isLoading: false,
      hasData: false,
      lastUpdate: null,
      error: null,
    }
  }

  render(): JSX.Element {
    return (
      <LazyEChartsTradingChart
        data={this.data}
        isLoading={this.state.isLoading}
        symbol='AAPL' // TODO: 設定から取得
        timeframe={this.config.timeframe || '1D'}
      />
    )
  }

  updateData(data: MarketData): void {
    this.data.push([data.timestamp, data.open, data.close, data.low, data.high, data.volume || 0])

    this.state = {
      ...this.state,
      hasData: true,
      lastUpdate: new Date(),
    }
  }

  cleanup(): void {
    this.data = []
    this.state = {
      isLoading: false,
      hasData: false,
      lastUpdate: null,
      error: null,
    }
  }

  updateConfig?(config: ChartConfig): void {
    this.config = { ...this.config, ...config }
  }

  getState?(): ChartState {
    return { ...this.state }
  }
}

/**
 * チャートファクトリー実装
 */
export class ChartFactory implements IChartFactory {
  createChart(type: ChartType, config: ChartConfig): IChartComponent {
    switch (type) {
      case 'tradingview-lightweight':
        return new OptimizedChartAdapter(config)
      case 'echarts':
        return new EChartsAdapter(config)
      default:
        throw new Error(`Unsupported chart type: ${type}`)
    }
  }

  getSupportedTypes(): ChartType[] {
    return ['tradingview-lightweight', 'echarts', 'candlestick', 'line', 'area']
  }
}

// シングルトンインスタンス
export const chartFactory = new ChartFactory()

/**
 * React フック: チャートインスタンスを管理
 */
export function useChart(type: ChartType, config: ChartConfig) {
  const [chart, setChart] = React.useState<IChartComponent | null>(null)

  React.useEffect(() => {
    const chartInstance = chartFactory.createChart(type, config)
    setChart(chartInstance)

    return () => {
      chartInstance.cleanup()
    }
  }, [type, config])

  const updateData = React.useCallback(
    (data: MarketData) => {
      chart?.updateData(data)
    },
    [chart]
  )

  const updateConfig = React.useCallback(
    (newConfig: Partial<ChartConfig>) => {
      chart?.updateConfig?.({ ...config, ...newConfig })
    },
    [chart, config]
  )

  return {
    chart,
    updateData,
    updateConfig,
    state: chart?.getState?.(),
  }
}
