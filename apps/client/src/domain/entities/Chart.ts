export class ChartData {
  private constructor(
    private readonly _timestamp: number,
    private readonly _open: number,
    private readonly _high: number,
    private readonly _low: number,
    private readonly _close: number,
    private readonly _volume: number
  ) {
    this.validate()
  }

  static create(data: {
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }): ChartData {
    return new ChartData(data.timestamp, data.open, data.high, data.low, data.close, data.volume)
  }

  get timestamp(): number {
    return this._timestamp
  }

  get open(): number {
    return this._open
  }

  get high(): number {
    return this._high
  }

  get low(): number {
    return this._low
  }

  get close(): number {
    return this._close
  }

  get volume(): number {
    return this._volume
  }

  get date(): Date {
    return new Date(this._timestamp * 1000)
  }

  isGreen(): boolean {
    return this._close > this._open
  }

  isRed(): boolean {
    return this._close < this._open
  }

  isDoji(): boolean {
    return Math.abs(this._close - this._open) < 0.01
  }

  getPriceRange(): number {
    return this._high - this._low
  }

  getBodySize(): number {
    return Math.abs(this._close - this._open)
  }

  getUpperShadow(): number {
    return this._high - Math.max(this._open, this._close)
  }

  getLowerShadow(): number {
    return Math.min(this._open, this._close) - this._low
  }

  private validate(): void {
    if (this._timestamp <= 0) {
      throw new Error('Timestamp must be positive')
    }
    if (this._open < 0 || this._high < 0 || this._low < 0 || this._close < 0) {
      throw new Error('Prices cannot be negative')
    }
    if (this._high < this._low) {
      throw new Error('High price cannot be less than low price')
    }
    if (this._high < Math.max(this._open, this._close)) {
      throw new Error('High price must be greater than or equal to open and close prices')
    }
    if (this._low > Math.min(this._open, this._close)) {
      throw new Error('Low price must be less than or equal to open and close prices')
    }
    if (this._volume < 0) {
      throw new Error('Volume cannot be negative')
    }
  }

  toPrimitive() {
    return {
      timestamp: this._timestamp,
      open: this._open,
      high: this._high,
      low: this._low,
      close: this._close,
      volume: this._volume,
    }
  }

  equals(other: ChartData): boolean {
    return (
      this._timestamp === other._timestamp &&
      this._open === other._open &&
      this._high === other._high &&
      this._low === other._low &&
      this._close === other._close &&
      this._volume === other._volume
    )
  }
}

export class ChartConfig {
  private constructor(
    private readonly _symbol: Symbol,
    private readonly _interval: TimeInterval,
    private readonly _chartType: ChartType,
    private readonly _indicators: ChartIndicator[],
    private readonly _drawings: ChartDrawing[]
  ) {}

  static create(data: {
    symbol: string
    interval?: string
    chartType?: 'candlestick' | 'line' | 'area'
    indicators?: ChartIndicator[]
    drawings?: ChartDrawing[]
  }): ChartConfig {
    return new ChartConfig(
      Symbol.fromString(data.symbol),
      TimeInterval.fromString(data.interval || '1D'),
      ChartType.fromString(data.chartType || 'candlestick'),
      data.indicators || [],
      data.drawings || []
    )
  }

  static fromPrimitive(data: {
    symbol: string
    interval: string
    chartType: 'candlestick' | 'line' | 'area'
    indicators: ChartIndicator[]
    drawings: ChartDrawing[]
  }): ChartConfig {
    return new ChartConfig(
      Symbol.fromString(data.symbol),
      TimeInterval.fromString(data.interval),
      ChartType.fromString(data.chartType),
      data.indicators,
      data.drawings
    )
  }

  get symbol(): Symbol {
    return this._symbol
  }

  get interval(): TimeInterval {
    return this._interval
  }

  get chartType(): ChartType {
    return this._chartType
  }

  get indicators(): readonly ChartIndicator[] {
    return [...this._indicators]
  }

  get drawings(): readonly ChartDrawing[] {
    return [...this._drawings]
  }

  withSymbol(symbol: string): ChartConfig {
    return new ChartConfig(
      Symbol.fromString(symbol),
      this._interval,
      this._chartType,
      this._indicators,
      this._drawings
    )
  }

  withInterval(interval: string): ChartConfig {
    return new ChartConfig(
      this._symbol,
      TimeInterval.fromString(interval),
      this._chartType,
      this._indicators,
      this._drawings
    )
  }

  withChartType(chartType: 'candlestick' | 'line' | 'area'): ChartConfig {
    return new ChartConfig(
      this._symbol,
      this._interval,
      ChartType.fromString(chartType),
      this._indicators,
      this._drawings
    )
  }

  addIndicator(indicator: ChartIndicator): ChartConfig {
    const exists = this._indicators.some(i => i.id === indicator.id)
    if (exists) {
      throw new Error(`Indicator with id ${indicator.id} already exists`)
    }

    return new ChartConfig(
      this._symbol,
      this._interval,
      this._chartType,
      [...this._indicators, indicator],
      this._drawings
    )
  }

  removeIndicator(indicatorId: string): ChartConfig {
    return new ChartConfig(
      this._symbol,
      this._interval,
      this._chartType,
      this._indicators.filter(i => i.id !== indicatorId),
      this._drawings
    )
  }

  updateIndicator(indicatorId: string, updates: Partial<ChartIndicator>): ChartConfig {
    const indicators = this._indicators.map(i => (i.id === indicatorId ? { ...i, ...updates } : i))

    return new ChartConfig(
      this._symbol,
      this._interval,
      this._chartType,
      indicators,
      this._drawings
    )
  }

  addDrawing(drawing: ChartDrawing): ChartConfig {
    return new ChartConfig(this._symbol, this._interval, this._chartType, this._indicators, [
      ...this._drawings,
      drawing,
    ])
  }

  removeDrawing(drawingId: string): ChartConfig {
    return new ChartConfig(
      this._symbol,
      this._interval,
      this._chartType,
      this._indicators,
      this._drawings.filter(d => d.id !== drawingId)
    )
  }

  getVisibleIndicators(): ChartIndicator[] {
    return this._indicators.filter(i => i.isVisible)
  }

  getIndicatorsByType(type: string): ChartIndicator[] {
    return this._indicators.filter(i => i.type === type)
  }

  hasIndicator(type: string): boolean {
    return this._indicators.some(i => i.type === type && i.isVisible)
  }

  toPrimitive() {
    return {
      symbol: this._symbol.toString(),
      interval: this._interval.toString(),
      chartType: this._chartType.toString(),
      indicators: this._indicators,
      drawings: this._drawings,
    }
  }
}

export class Symbol {
  private constructor(private readonly value: string) {
    this.validate()
  }

  static fromString(symbol: string): Symbol {
    return new Symbol(symbol.toUpperCase().trim())
  }

  private validate(): void {
    if (!this.value || this.value.length === 0) {
      throw new Error('Symbol cannot be empty')
    }
    if (!/^[A-Z]{1,10}$/.test(this.value)) {
      throw new Error('Symbol must contain only uppercase letters (1-10 characters)')
    }
  }

  toString(): string {
    return this.value
  }

  equals(other: Symbol): boolean {
    return this.value === other.value
  }
}

export class TimeInterval {
  private constructor(private readonly value: string) {}

  static readonly ONE_MINUTE = new TimeInterval('1m')
  static readonly FIVE_MINUTES = new TimeInterval('5m')
  static readonly FIFTEEN_MINUTES = new TimeInterval('15m')
  static readonly THIRTY_MINUTES = new TimeInterval('30m')
  static readonly ONE_HOUR = new TimeInterval('1H')
  static readonly FOUR_HOURS = new TimeInterval('4H')
  static readonly ONE_DAY = new TimeInterval('1D')
  static readonly ONE_WEEK = new TimeInterval('1W')
  static readonly ONE_MONTH = new TimeInterval('1M')

  static fromString(interval: string): TimeInterval {
    switch (interval) {
      case '1m':
        return TimeInterval.ONE_MINUTE
      case '5m':
        return TimeInterval.FIVE_MINUTES
      case '15m':
        return TimeInterval.FIFTEEN_MINUTES
      case '30m':
        return TimeInterval.THIRTY_MINUTES
      case '1H':
        return TimeInterval.ONE_HOUR
      case '4H':
        return TimeInterval.FOUR_HOURS
      case '1D':
        return TimeInterval.ONE_DAY
      case '1W':
        return TimeInterval.ONE_WEEK
      case '1M':
        return TimeInterval.ONE_MONTH
      default:
        throw new Error(`Invalid time interval: ${interval}`)
    }
  }

  isIntraday(): boolean {
    return ['1m', '5m', '15m', '30m', '1H', '4H'].includes(this.value)
  }

  isDaily(): boolean {
    return this.value === '1D'
  }

  isWeekly(): boolean {
    return this.value === '1W'
  }

  isMonthly(): boolean {
    return this.value === '1M'
  }

  getMinutes(): number {
    switch (this.value) {
      case '1m':
        return 1
      case '5m':
        return 5
      case '15m':
        return 15
      case '30m':
        return 30
      case '1H':
        return 60
      case '4H':
        return 240
      case '1D':
        return 1440
      case '1W':
        return 10080
      case '1M':
        return 43200
      default:
        throw new Error(`Cannot convert ${this.value} to minutes`)
    }
  }

  toString(): string {
    return this.value
  }

  equals(other: TimeInterval): boolean {
    return this.value === other.value
  }
}

export class ChartType {
  private constructor(private readonly value: 'candlestick' | 'line' | 'area') {}

  static readonly CANDLESTICK = new ChartType('candlestick')
  static readonly LINE = new ChartType('line')
  static readonly AREA = new ChartType('area')

  static fromString(type: string): ChartType {
    switch (type) {
      case 'candlestick':
        return ChartType.CANDLESTICK
      case 'line':
        return ChartType.LINE
      case 'area':
        return ChartType.AREA
      default:
        throw new Error(`Invalid chart type: ${type}`)
    }
  }

  isCandlestick(): boolean {
    return this.value === 'candlestick'
  }

  isLine(): boolean {
    return this.value === 'line'
  }

  isArea(): boolean {
    return this.value === 'area'
  }

  showsVolume(): boolean {
    return this.value === 'candlestick'
  }

  toString(): 'candlestick' | 'line' | 'area' {
    return this.value
  }

  equals(other: ChartType): boolean {
    return this.value === other.value
  }
}

export type ChartIndicator = {
  id: string
  type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger'
  parameters: Record<string, unknown>
  isVisible: boolean
}

export type ChartDrawing = {
  id: string
  type: 'line' | 'rectangle' | 'arrow' | 'text'
  coordinates: ChartCoordinate[]
  style: DrawingStyle
}

export type ChartCoordinate = {
  x: number
  y: number
}

export type DrawingStyle = {
  color: string
  lineWidth: number
  opacity: number
}
