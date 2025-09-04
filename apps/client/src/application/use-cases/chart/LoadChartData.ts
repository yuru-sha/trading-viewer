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
    const [data, config] = await Promise.all([
      this.chartRepository.getChartData(request.symbol, request.interval, request.from, request.to),
      request.userId ? this.chartRepository.getChartConfig(request.userId, request.symbol) : null,
    ])

    const indicators: Record<string, number[]> = {}

    if (config?.indicators) {
      for (const indicator of config.indicators) {
        if (!indicator.isVisible) continue

        switch (indicator.type) {
          case 'sma': {
            const period = indicator.parameters.period as number
            indicators[`sma_${period}`] = this.analysisService.calculateSMA(data, period)
            break
          }
          case 'ema': {
            const emaPeriod = indicator.parameters.period as number
            indicators[`ema_${emaPeriod}`] = this.analysisService.calculateEMA(data, emaPeriod)
            break
          }
          case 'rsi': {
            const rsiPeriod = indicator.parameters.period as number
            indicators[`rsi_${rsiPeriod}`] = this.analysisService.calculateRSI(data, rsiPeriod)
            break
          }
        }
      }
    }

    return {
      data,
      config,
      indicators,
    }
  }
}
