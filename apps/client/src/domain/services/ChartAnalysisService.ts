import type { ChartData, ChartIndicator } from '@/domain/entities/Chart'

export interface ChartAnalysisService {
  calculateSMA(data: ChartData[], period: number): number[]
  calculateEMA(data: ChartData[], period: number): number[]
  calculateRSI(data: ChartData[], period: number): number[]
  calculateMACD(
    data: ChartData[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): {
    macd: number[]
    signal: number[]
    histogram: number[]
  }
  calculateBollingerBands(
    data: ChartData[],
    period: number,
    stdDev: number
  ): {
    upper: number[]
    middle: number[]
    lower: number[]
  }
  validateIndicatorParameters(indicator: ChartIndicator): boolean
}
