import React from 'react'
import { CHART_TYPES } from '@trading-viewer/shared'
import type { PriceData } from '../utils/indicators'

// Chart component interfaces
export interface ChartProps {
  symbol: string
  data: PriceData[]
  width?: number
  height?: number
  onDataUpdate?: (data: PriceData[]) => void
  className?: string
}

export interface IChart {
  render(): React.ReactElement
  updateData(data: PriceData[]): void
  getType(): string
  destroy?(): void
}

// Chart component types
export type ChartType = keyof typeof CHART_TYPES
export type ChartComponentType = React.ComponentType<ChartProps>

// Abstract Chart Component
export abstract class BaseChart implements IChart {
  protected props: ChartProps
  protected type: string

  constructor(props: ChartProps, type: string) {
    this.props = props
    this.type = type
  }

  abstract render(): React.ReactElement

  updateData(data: PriceData[]): void {
    this.props.data = data
    if (this.props.onDataUpdate) {
      this.props.onDataUpdate(data)
    }
  }

  getType(): string {
    return this.type
  }

  destroy?(): void {
    // Default implementation - override if needed
  }
}

// ECharts-based Chart Components
class CandlestickChart extends BaseChart {
  constructor(props: ChartProps) {
    super(props, CHART_TYPES.candlestick)
  }

  render(): React.ReactElement {
    const EChartsTradingChart = React.lazy(() => import('../components/chart/EChartsTradingChart'))

    return (
      <React.Suspense fallback={<div>Loading chart...</div>}>
        <EChartsTradingChart {...this.props} chartType={'candlestick'} />
      </React.Suspense>
    )
  }
}

class LineChart extends BaseChart {
  constructor(props: ChartProps) {
    super(props, CHART_TYPES.line)
  }

  render(): React.ReactElement {
    const EChartsTradingChart = React.lazy(() => import('../components/chart/EChartsTradingChart'))

    return (
      <React.Suspense fallback={<div>Loading chart...</div>}>
        <EChartsTradingChart {...this.props} chartType={'line'} />
      </React.Suspense>
    )
  }
}

class AreaChart extends BaseChart {
  constructor(props: ChartProps) {
    super(props, CHART_TYPES.area)
  }

  render(): React.ReactElement {
    const EChartsTradingChart = React.lazy(() => import('../components/chart/EChartsTradingChart'))

    return (
      <React.Suspense fallback={<div>Loading chart...</div>}>
        <EChartsTradingChart {...this.props} chartType={'area'} />
      </React.Suspense>
    )
  }
}

class BarChart extends BaseChart {
  constructor(props: ChartProps) {
    super(props, CHART_TYPES.bar)
  }

  render(): React.ReactElement {
    const EChartsTradingChart = React.lazy(() => import('../components/chart/EChartsTradingChart'))

    return (
      <React.Suspense fallback={<div>Loading chart...</div>}>
        <EChartsTradingChart {...this.props} chartType='candle' />
      </React.Suspense>
    )
  }
}

// Alternative chart implementations
class EChartsChart extends BaseChart {
  constructor(props: ChartProps, chartType: string) {
    super(props, chartType)
  }

  render(): React.ReactElement {
    const EChartsTradingChart = React.lazy(() => import('../components/chart/EChartsTradingChart'))

    return (
      <React.Suspense fallback={<div>Loading ECharts...</div>}>
        <EChartsTradingChart {...this.props} chartType={this.type as 'area' | 'line' | 'candle'} />
      </React.Suspense>
    )
  }
}

// Chart Factory Interface
export interface IChartFactory {
  createChart(type: ChartType, props: ChartProps): IChart
  getSupportedTypes(): ChartType[]
  isTypeSupported(type: ChartType): boolean
}

// Main Chart Factory Implementation
export class ChartComponentFactory implements IChartFactory {
  private static instance: ChartComponentFactory
  private chartConstructors: Map<ChartType, new (props: ChartProps) => IChart>

  private constructor() {
    this.chartConstructors = new Map([
      ['candlestick', CandlestickChart],
      ['line', LineChart],
      ['area', AreaChart],
      ['bar', BarChart],
    ])
  }

  // Singleton pattern
  static getInstance(): ChartComponentFactory {
    if (!ChartComponentFactory.instance) {
      ChartComponentFactory.instance = new ChartComponentFactory()
    }
    return ChartComponentFactory.instance
  }

  createChart(type: ChartType, props: ChartProps): IChart {
    const ChartConstructor = this.chartConstructors.get(type)

    if (!ChartConstructor) {
      throw new Error(`Unsupported chart type: ${type}`)
    }

    return new ChartConstructor(props)
  }

  getSupportedTypes(): ChartType[] {
    return Array.from(this.chartConstructors.keys())
  }

  isTypeSupported(type: ChartType): boolean {
    return this.chartConstructors.has(type)
  }

  // Register new chart types at runtime
  registerChartType(type: ChartType, constructor: new (props: ChartProps) => IChart): void {
    this.chartConstructors.set(type, constructor)
  }

  // Unregister chart types
  unregisterChartType(type: ChartType): boolean {
    return this.chartConstructors.delete(type)
  }
}

// Alternative ECharts Factory
export class EChartsFactory implements IChartFactory {
  private static instance: EChartsFactory

  static getInstance(): EChartsFactory {
    if (!EChartsFactory.instance) {
      EChartsFactory.instance = new EChartsFactory()
    }
    return EChartsFactory.instance
  }

  createChart(type: ChartType, props: ChartProps): IChart {
    return new EChartsChart(props, type)
  }

  getSupportedTypes(): ChartType[] {
    return ['candlestick', 'line', 'area', 'bar']
  }

  isTypeSupported(type: ChartType): boolean {
    return this.getSupportedTypes().includes(type)
  }
}

// Factory Manager - Strategy Pattern for choosing factory
export class ChartFactoryManager {
  private static instance: ChartFactoryManager
  private currentFactory: IChartFactory
  private availableFactories: Map<string, IChartFactory>

  private constructor() {
    this.availableFactories = new Map([
      ['echarts', ChartComponentFactory.getInstance()],
      ['echarts-alternative', EChartsFactory.getInstance()],
    ])
    this.currentFactory = this.availableFactories.get('echarts')!
  }

  static getInstance(): ChartFactoryManager {
    if (!ChartFactoryManager.instance) {
      ChartFactoryManager.instance = new ChartFactoryManager()
    }
    return ChartFactoryManager.instance
  }

  setFactory(factoryName: string): void {
    const factory = this.availableFactories.get(factoryName)
    if (!factory) {
      throw new Error(`Unknown factory: ${factoryName}`)
    }
    this.currentFactory = factory
  }

  createChart(type: ChartType, props: ChartProps): IChart {
    return this.currentFactory.createChart(type, props)
  }

  getCurrentFactory(): IChartFactory {
    return this.currentFactory
  }

  getAvailableFactories(): string[] {
    return Array.from(this.availableFactories.keys())
  }
}

// React Hook for using Chart Factory
export const useChartFactory = () => {
  const factoryManager = React.useMemo(() => ChartFactoryManager.getInstance(), [])

  const createChart = React.useCallback(
    (type: ChartType, props: ChartProps): IChart => {
      return factoryManager.createChart(type, props)
    },
    [factoryManager]
  )

  const setFactory = React.useCallback(
    (factoryName: string) => {
      factoryManager.setFactory(factoryName)
    },
    [factoryManager]
  )

  return {
    createChart,
    setFactory,
    getSupportedTypes: () => factoryManager.getCurrentFactory().getSupportedTypes(),
    isTypeSupported: (type: ChartType) => factoryManager.getCurrentFactory().isTypeSupported(type),
    getAvailableFactories: () => factoryManager.getAvailableFactories(),
  }
}

// React Component Factory - Higher level abstraction
export const ChartComponent: React.FC<
  ChartProps & { chartType: ChartType; factoryType?: string }
> = ({ chartType, factoryType = 'echarts', ...props }) => {
  const factoryManager = ChartFactoryManager.getInstance()

  React.useEffect(() => {
    factoryManager.setFactory(factoryType)
  }, [factoryType])

  const chart = React.useMemo(() => {
    return factoryManager.createChart(chartType, props)
  }, [chartType, props, factoryManager])

  return chart.render()
}

export default ChartComponentFactory
