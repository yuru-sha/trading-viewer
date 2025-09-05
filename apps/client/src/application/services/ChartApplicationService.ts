import {
  ChartAnalysisService,
  ChartPatternDetectionService,
} from '@/domain/services/ChartAnalysisService'
import { ChartRepository } from '@/domain/repositories/ChartRepository'
import { MarketDataRepository } from '@/domain/repositories/MarketDataRepository'
import { ChartData, ChartConfig, ChartIndicator, ChartDrawing } from '@/domain/entities/Chart'
import { MarketData, Alert } from '@/domain/entities/MarketData'

export class ChartApplicationService {
  constructor(
    private chartRepository: ChartRepository,
    private analysisService: ChartAnalysisService,
    private patternDetectionService: ChartPatternDetectionService
  ) {}

  async loadChartData(request: {
    symbol: string
    interval: string
    from: number
    to: number
    userId?: string
  }) {
    const [rawData, config] = await Promise.all([
      this.chartRepository.getChartData(request.symbol, request.interval, request.from, request.to),
      request.userId ? this.chartRepository.getChartConfig(request.userId, request.symbol) : null,
    ])

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

    const chartConfig = config
      ? ChartConfig.fromPrimitive({
          symbol: config.symbol,
          interval: config.interval,
          chartType: config.chartType as 'candlestick' | 'line' | 'area',
          indicators: config.indicators,
          drawings: config.drawings,
        })
      : ChartConfig.create({ symbol: request.symbol })

    const indicators = await this.calculateIndicators(chartData, chartConfig)
    const patterns = this.patternDetectionService.detectCandlestickPatterns(chartData)
    const supportResistance = this.patternDetectionService.detectSupportResistance(chartData)

    return {
      data: chartData.map(d => d.toPrimitive()),
      config: chartConfig.toPrimitive(),
      indicators,
      patterns,
      supportResistance,
    }
  }

  async saveChartConfig(request: {
    userId: string
    symbol: string
    config: {
      interval: string
      chartType: 'candlestick' | 'line' | 'area'
      indicators: ChartIndicator[]
      drawings: ChartDrawing[]
    }
  }) {
    const chartConfig = ChartConfig.create({
      symbol: request.symbol,
      interval: request.config.interval,
      chartType: request.config.chartType,
      indicators: request.config.indicators,
      drawings: request.config.drawings,
    })

    // Validate indicators before saving
    for (const indicator of chartConfig.indicators) {
      const isValid = this.analysisService.validateIndicatorParameters(indicator)
      if (!isValid) {
        throw new Error(`Invalid indicator configuration: ${indicator.type}`)
      }
    }

    await this.chartRepository.saveChartConfig(
      request.userId,
      request.symbol,
      chartConfig.toPrimitive()
    )

    return { success: true }
  }

  async addIndicator(request: {
    userId: string
    symbol: string
    indicator: {
      id: string
      type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger'
      parameters: Record<string, unknown>
      isVisible: boolean
    }
  }) {
    const isValid = this.analysisService.validateIndicatorParameters(request.indicator)
    if (!isValid) {
      throw new Error(`Invalid indicator parameters for ${request.indicator.type}`)
    }

    const currentConfig = await this.chartRepository.getChartConfig(request.userId, request.symbol)
    const chartConfig = currentConfig
      ? ChartConfig.fromPrimitive(currentConfig)
      : ChartConfig.create({ symbol: request.symbol })

    const updatedConfig = chartConfig.addIndicator(request.indicator)

    await this.chartRepository.saveChartConfig(
      request.userId,
      request.symbol,
      updatedConfig.toPrimitive()
    )

    return { success: true }
  }

  async removeIndicator(request: { userId: string; symbol: string; indicatorId: string }) {
    const currentConfig = await this.chartRepository.getChartConfig(request.userId, request.symbol)
    if (!currentConfig) {
      throw new Error('Chart configuration not found')
    }

    const chartConfig = ChartConfig.fromPrimitive(currentConfig)
    const updatedConfig = chartConfig.removeIndicator(request.indicatorId)

    await this.chartRepository.saveChartConfig(
      request.userId,
      request.symbol,
      updatedConfig.toPrimitive()
    )

    return { success: true }
  }

  async addDrawing(request: {
    userId: string
    symbol: string
    drawing: {
      id: string
      type: 'line' | 'rectangle' | 'arrow' | 'text'
      coordinates: Array<{ x: number; y: number }>
      style: {
        color: string
        lineWidth: number
        opacity: number
      }
    }
  }) {
    const currentConfig = await this.chartRepository.getChartConfig(request.userId, request.symbol)
    const chartConfig = currentConfig
      ? ChartConfig.fromPrimitive(currentConfig)
      : ChartConfig.create({ symbol: request.symbol })

    const updatedConfig = chartConfig.addDrawing(request.drawing)

    await this.chartRepository.saveChartConfig(
      request.userId,
      request.symbol,
      updatedConfig.toPrimitive()
    )

    return { success: true }
  }

  async removeDrawing(request: { userId: string; symbol: string; drawingId: string }) {
    const currentConfig = await this.chartRepository.getChartConfig(request.userId, request.symbol)
    if (!currentConfig) {
      throw new Error('Chart configuration not found')
    }

    const chartConfig = ChartConfig.fromPrimitive(currentConfig)
    const updatedConfig = chartConfig.removeDrawing(request.drawingId)

    await this.chartRepository.saveChartConfig(
      request.userId,
      request.symbol,
      updatedConfig.toPrimitive()
    )

    return { success: true }
  }

  async analyzeChart(request: {
    symbol: string
    interval: string
    from: number
    to: number
    analysisType: 'patterns' | 'support_resistance' | 'trends' | 'all'
  }) {
    const rawData = await this.chartRepository.getChartData(
      request.symbol,
      request.interval,
      request.from,
      request.to
    )

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

    const analysis: Record<string, unknown> = {}

    if (request.analysisType === 'patterns' || request.analysisType === 'all') {
      analysis.patterns = this.patternDetectionService.detectCandlestickPatterns(chartData)
    }

    if (request.analysisType === 'support_resistance' || request.analysisType === 'all') {
      analysis.supportResistance = this.patternDetectionService.detectSupportResistance(chartData)
    }

    if (request.analysisType === 'trends' || request.analysisType === 'all') {
      analysis.trends = this.analyzeTrends(chartData)
    }

    return analysis
  }

  private async calculateIndicators(chartData: ChartData[], chartConfig: ChartConfig) {
    const indicators: Record<string, number[]> = {}

    for (const indicator of chartConfig.getVisibleIndicators()) {
      try {
        switch (indicator.type) {
          case 'sma': {
            const period = indicator.parameters.period as number
            indicators[`sma_${period}`] = this.analysisService.calculateSMA(chartData, period)
            break
          }
          case 'ema': {
            const period = indicator.parameters.period as number
            indicators[`ema_${period}`] = this.analysisService.calculateEMA(chartData, period)
            break
          }
          case 'rsi': {
            const period = indicator.parameters.period as number
            indicators[`rsi_${period}`] = this.analysisService.calculateRSI(chartData, period)
            break
          }
          case 'macd': {
            const fastPeriod = (indicator.parameters.fastPeriod as number) || 12
            const slowPeriod = (indicator.parameters.slowPeriod as number) || 26
            const signalPeriod = (indicator.parameters.signalPeriod as number) || 9
            const result = this.analysisService.calculateMACD(
              chartData,
              fastPeriod,
              slowPeriod,
              signalPeriod
            )
            indicators[`macd_${fastPeriod}_${slowPeriod}`] = result.macd
            indicators[`macd_signal_${signalPeriod}`] = result.signal
            indicators[`macd_histogram`] = result.histogram
            break
          }
          case 'bollinger': {
            const period = (indicator.parameters.period as number) || 20
            const stdDev = (indicator.parameters.stdDev as number) || 2
            const result = this.analysisService.calculateBollingerBands(chartData, period, stdDev)
            indicators[`bollinger_upper_${period}`] = result.upper
            indicators[`bollinger_middle_${period}`] = result.middle
            indicators[`bollinger_lower_${period}`] = result.lower
            break
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error calculating ${indicator.type} indicator:`, error)
      }
    }

    return indicators
  }

  private analyzeTrends(chartData: ChartData[]) {
    if (chartData.length < 20) {
      return { trend: 'insufficient_data' }
    }

    const recentData = chartData.slice(-20)
    const sma20 = this.analysisService.calculateSMA(recentData, 20)
    const currentPrice = recentData[recentData.length - 1].close
    const smaValue = sma20[sma20.length - 1]

    // Simple trend analysis
    const priceAboveSMA = currentPrice > smaValue
    const smaSlope = sma20.length >= 2 ? sma20[sma20.length - 1] - sma20[sma20.length - 2] : 0

    let trend = 'sideways'
    if (priceAboveSMA && smaSlope > 0) {
      trend = 'bullish'
    } else if (!priceAboveSMA && smaSlope < 0) {
      trend = 'bearish'
    }

    return {
      trend,
      currentPrice,
      sma20: smaValue,
      priceAboveSMA,
      smaSlope,
    }
  }
}

export class MarketDataApplicationService {
  constructor(private marketDataRepository: MarketDataRepository) {}

  async getMarketData(symbol: string) {
    const rawData = await this.marketDataRepository.getMarketData(symbol)

    return MarketData.create({
      symbol: rawData.symbol,
      price: rawData.price,
      change: rawData.change,
      changePercent: rawData.changePercent,
      volume: rawData.volume,
      marketCap: rawData.marketCap,
      high52Week: rawData.high52Week,
      low52Week: rawData.low52Week,
      timestamp: rawData.timestamp,
    }).toPrimitive()
  }

  async getMultipleMarketData(symbols: string[]) {
    const promises = symbols.map(symbol => this.getMarketData(symbol))
    return Promise.all(promises)
  }

  async createAlert(request: {
    userId: string
    symbol: string
    condition: 'above' | 'below' | 'crosses_above' | 'crosses_below'
    targetPrice: number
  }) {
    const alert = Alert.create({
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: request.symbol,
      condition: request.condition,
      targetPrice: request.targetPrice,
    })

    // Store alert (implementation would depend on repository)
    // await this.alertRepository.save(request.userId, alert.toPrimitive())

    return { success: true, alertId: alert.id }
  }

  async checkAlerts(
    _userId: string,
    _currentPrices: Record<string, { current: number; previous: number }>
  ) {
    // Retrieve user alerts (implementation would depend on repository)
    // const userAlerts = await this.alertRepository.getUserAlerts(userId)

    const triggeredAlerts: unknown[] = []

    // for (const alertData of userAlerts) {
    //   const alert = Alert.fromPrimitive(alertData)
    //   const priceData = currentPrices[alert.symbol.code]
    //
    //   if (priceData && alert.checkTrigger(priceData.current, priceData.previous)) {
    //     triggeredAlerts.push(alert.toPrimitive())
    //   }
    // }

    return triggeredAlerts
  }
}
