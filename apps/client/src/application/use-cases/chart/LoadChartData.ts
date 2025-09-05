import type { ChartRepository } from '@/domain/repositories/ChartRepository'
import type { ChartData, ChartConfig } from '@/domain/entities/Chart'
import type { ChartAnalysisService } from '@/domain/services/ChartAnalysisService'

export type LoadChartDataRequest = {
  symbol: string
  interval: string
  from: Date
  to: Date
  userId?: string
}

export type LoadChartDataResponse = {
  data: ChartData[]
  config: ChartConfig | null
  indicators: Record<string, number[]>
}

export class LoadChartData {
  constructor(
    private chartRepository: ChartRepository,
    private analysisService: ChartAnalysisService
  ) {}

  async execute(request: LoadChartDataRequest): Promise<LoadChartDataResponse> {
    const [rawData, config] = await Promise.all([
      this.chartRepository.getChartData(request.symbol, request.interval, request.from, request.to),
      request.userId ? this.chartRepository.getChartConfig(request.userId, request.symbol) : null,
    ])

    // Convert raw data to domain entities
    const chartData = rawData.map(data =>
      ChartData.create({
        timestamp: data.timestamp,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
      })
    )

    // Convert config to domain entity
    const chartConfig = config
      ? ChartConfig.fromPrimitive({
          symbol: config.symbol,
          interval: config.interval,
          chartType: config.chartType as 'candlestick' | 'line' | 'area',
          indicators: config.indicators,
          drawings: config.drawings,
        })
      : ChartConfig.create({ symbol: request.symbol })

    const indicators: Record<string, number[]> = {}

    // Process visible indicators using domain service
    for (const indicator of chartConfig.getVisibleIndicators()) {
      try {
        const isValid = this.analysisService.validateIndicatorParameters(indicator)
        if (!isValid) {
          // eslint-disable-next-line no-console
          console.warn(`Invalid indicator parameters for ${indicator.type}:`, indicator.parameters)
          continue
        }

        switch (indicator.type) {
          case 'sma': {
            const period = indicator.parameters.period as number
            indicators[`sma_${period}`] = this.analysisService.calculateSMA(chartData, period)
            break
          }
          case 'ema': {
            const emaPeriod = indicator.parameters.period as number
            indicators[`ema_${emaPeriod}`] = this.analysisService.calculateEMA(chartData, emaPeriod)
            break
          }
          case 'rsi': {
            const rsiPeriod = indicator.parameters.period as number
            indicators[`rsi_${rsiPeriod}`] = this.analysisService.calculateRSI(chartData, rsiPeriod)
            break
          }
          case 'macd': {
            const fastPeriod = (indicator.parameters.fastPeriod as number) || 12
            const slowPeriod = (indicator.parameters.slowPeriod as number) || 26
            const signalPeriod = (indicator.parameters.signalPeriod as number) || 9
            const macdResult = this.analysisService.calculateMACD(
              chartData,
              fastPeriod,
              slowPeriod,
              signalPeriod
            )
            indicators[`macd_${fastPeriod}_${slowPeriod}`] = macdResult.macd
            indicators[`macd_signal_${signalPeriod}`] = macdResult.signal
            indicators[`macd_histogram`] = macdResult.histogram
            break
          }
          case 'bollinger': {
            const period = (indicator.parameters.period as number) || 20
            const stdDev = (indicator.parameters.stdDev as number) || 2
            const bollingerResult = this.analysisService.calculateBollingerBands(
              chartData,
              period,
              stdDev
            )
            indicators[`bollinger_upper_${period}`] = bollingerResult.upper
            indicators[`bollinger_middle_${period}`] = bollingerResult.middle
            indicators[`bollinger_lower_${period}`] = bollingerResult.lower
            break
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error calculating ${indicator.type} indicator:`, error)
      }
    }

    return {
      data: chartData.map(d => d.toPrimitive()),
      config: chartConfig.toPrimitive(),
      indicators,
    }
  }
}
