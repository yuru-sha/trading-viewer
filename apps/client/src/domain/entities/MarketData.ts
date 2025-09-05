export class MarketData {
  private constructor(
    private readonly _symbol: TradingSymbol,
    private readonly _price: number,
    private readonly _change: number,
    private readonly _changePercent: number,
    private readonly _volume: number,
    private readonly _marketCap: number | null,
    private readonly _high52Week: number | null,
    private readonly _low52Week: number | null,
    private readonly _timestamp: Date
  ) {
    this.validate()
  }

  static create(data: {
    symbol: string
    price: number
    change: number
    changePercent: number
    volume: number
    marketCap?: number
    high52Week?: number
    low52Week?: number
    timestamp?: Date
  }): MarketData {
    return new MarketData(
      TradingSymbol.fromString(data.symbol),
      data.price,
      data.change,
      data.changePercent,
      data.volume,
      data.marketCap ?? null,
      data.high52Week ?? null,
      data.low52Week ?? null,
      data.timestamp ?? new Date()
    )
  }

  static fromPrimitive(data: {
    symbol: string
    price: number
    change: number
    changePercent: number
    volume: number
    marketCap: number | null
    high52Week: number | null
    low52Week: number | null
    timestamp: Date
  }): MarketData {
    return new MarketData(
      TradingSymbol.fromString(data.symbol),
      data.price,
      data.change,
      data.changePercent,
      data.volume,
      data.marketCap,
      data.high52Week,
      data.low52Week,
      data.timestamp
    )
  }

  get symbol(): TradingSymbol {
    return this._symbol
  }

  get price(): number {
    return this._price
  }

  get change(): number {
    return this._change
  }

  get changePercent(): number {
    return this._changePercent
  }

  get volume(): number {
    return this._volume
  }

  get marketCap(): number | null {
    return this._marketCap
  }

  get high52Week(): number | null {
    return this._high52Week
  }

  get low52Week(): number | null {
    return this._low52Week
  }

  get timestamp(): Date {
    return this._timestamp
  }

  get previousClose(): number {
    return this._price - this._change
  }

  get isPositive(): boolean {
    return this._change > 0
  }

  get isNegative(): boolean {
    return this._change < 0
  }

  get isFlat(): boolean {
    return Math.abs(this._change) < 0.01
  }

  get isNear52WeekHigh(): boolean {
    if (!this._high52Week) return false
    return this._price >= this._high52Week * 0.95 // Within 5% of 52-week high
  }

  get isNear52WeekLow(): boolean {
    if (!this._low52Week) return false
    return this._price <= this._low52Week * 1.05 // Within 5% of 52-week low
  }

  get isStale(): boolean {
    const now = new Date()
    const ageInMinutes = (now.getTime() - this._timestamp.getTime()) / (1000 * 60)
    return ageInMinutes > 15 // Data is stale if older than 15 minutes
  }

  withUpdatedPrice(price: number): MarketData {
    if (price <= 0) {
      throw new Error('Price must be positive')
    }

    const previousClose = this.previousClose
    const change = price - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    return new MarketData(
      this._symbol,
      price,
      change,
      changePercent,
      this._volume,
      this._marketCap,
      this._high52Week,
      this._low52Week,
      new Date()
    )
  }

  withUpdatedVolume(volume: number): MarketData {
    if (volume < 0) {
      throw new Error('Volume cannot be negative')
    }

    return new MarketData(
      this._symbol,
      this._price,
      this._change,
      this._changePercent,
      volume,
      this._marketCap,
      this._high52Week,
      this._low52Week,
      new Date()
    )
  }

  calculateValueAtRisk(confidenceLevel: number = 0.95): number {
    // Simple VaR calculation using historical volatility approximation
    // In a real implementation, this would use historical price data
    const volatility = Math.abs(this._changePercent) / 100
    const zScore = confidenceLevel === 0.95 ? 1.645 : 2.326 // 95% or 99%
    return this._price * volatility * zScore
  }

  private validate(): void {
    if (this._price <= 0) {
      throw new Error('Price must be positive')
    }

    if (this._volume < 0) {
      throw new Error('Volume cannot be negative')
    }

    if (this._marketCap !== null && this._marketCap < 0) {
      throw new Error('Market cap cannot be negative')
    }

    if (this._high52Week !== null && this._high52Week <= 0) {
      throw new Error('52-week high must be positive')
    }

    if (this._low52Week !== null && this._low52Week <= 0) {
      throw new Error('52-week low must be positive')
    }

    if (
      this._high52Week !== null &&
      this._low52Week !== null &&
      this._high52Week < this._low52Week
    ) {
      throw new Error('52-week high cannot be less than 52-week low')
    }
  }

  toPrimitive() {
    return {
      symbol: this._symbol.toString(),
      price: this._price,
      change: this._change,
      changePercent: this._changePercent,
      volume: this._volume,
      marketCap: this._marketCap,
      high52Week: this._high52Week,
      low52Week: this._low52Week,
      timestamp: this._timestamp,
    }
  }

  equals(other: MarketData): boolean {
    return (
      this._symbol.equals(other._symbol) &&
      this._price === other._price &&
      this._change === other._change &&
      this._changePercent === other._changePercent &&
      this._volume === other._volume &&
      this._marketCap === other._marketCap &&
      this._high52Week === other._high52Week &&
      this._low52Week === other._low52Week &&
      this._timestamp.getTime() === other._timestamp.getTime()
    )
  }
}

export class TradingSymbol {
  private constructor(
    private readonly _code: string,
    private readonly _name: string,
    private readonly _exchange: string,
    private readonly _type: SymbolType,
    private readonly _currency: string,
    private readonly _isActive: boolean
  ) {
    this.validate()
  }

  static fromString(symbol: string): TradingSymbol {
    // For backward compatibility, create a minimal symbol from string
    return new TradingSymbol(
      symbol.toUpperCase().trim(),
      symbol.toUpperCase().trim(),
      'UNKNOWN',
      SymbolType.STOCK,
      'USD',
      true
    )
  }

  static create(data: {
    code: string
    name: string
    exchange: string
    type: 'stock' | 'crypto' | 'forex' | 'commodity'
    currency: string
    isActive?: boolean
  }): TradingSymbol {
    return new TradingSymbol(
      data.code.toUpperCase().trim(),
      data.name.trim(),
      data.exchange.toUpperCase().trim(),
      SymbolType.fromString(data.type),
      data.currency.toUpperCase().trim(),
      data.isActive ?? true
    )
  }

  static fromPrimitive(data: {
    symbol: string
    name: string
    exchange: string
    type: 'stock' | 'crypto' | 'forex' | 'commodity'
    currency: string
    isActive: boolean
  }): TradingSymbol {
    return new TradingSymbol(
      data.symbol.toUpperCase().trim(),
      data.name.trim(),
      data.exchange.toUpperCase().trim(),
      SymbolType.fromString(data.type),
      data.currency.toUpperCase().trim(),
      data.isActive
    )
  }

  get code(): string {
    return this._code
  }

  get name(): string {
    return this._name
  }

  get exchange(): string {
    return this._exchange
  }

  get type(): SymbolType {
    return this._type
  }

  get currency(): string {
    return this._currency
  }

  get isActive(): boolean {
    return this._isActive
  }

  get isStock(): boolean {
    return this._type.isStock()
  }

  get isCrypto(): boolean {
    return this._type.isCrypto()
  }

  get isForex(): boolean {
    return this._type.isForex()
  }

  get isCommodity(): boolean {
    return this._type.isCommodity()
  }

  private validate(): void {
    if (!this._code || this._code.length === 0) {
      throw new Error('Symbol code cannot be empty')
    }
    if (!/^[A-Z]{1,10}$/.test(this._code)) {
      throw new Error('Symbol code must contain only uppercase letters (1-10 characters)')
    }
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Symbol name cannot be empty')
    }
    if (!this._currency || this._currency.length !== 3) {
      throw new Error('Currency must be a 3-character code')
    }
  }

  toString(): string {
    return this._code
  }

  toDisplayString(): string {
    return `${this._code} (${this._name})`
  }

  equals(other: TradingSymbol): boolean {
    return (
      this._code === other._code &&
      this._exchange === other._exchange &&
      this._type.equals(other._type)
    )
  }

  toPrimitive() {
    return {
      symbol: this._code,
      name: this._name,
      exchange: this._exchange,
      type: this._type.toString(),
      currency: this._currency,
      isActive: this._isActive,
    }
  }
}

export class SymbolType {
  private constructor(private readonly value: 'stock' | 'crypto' | 'forex' | 'commodity') {}

  static readonly STOCK = new SymbolType('stock')
  static readonly CRYPTO = new SymbolType('crypto')
  static readonly FOREX = new SymbolType('forex')
  static readonly COMMODITY = new SymbolType('commodity')

  static fromString(type: string): SymbolType {
    switch (type) {
      case 'stock':
        return SymbolType.STOCK
      case 'crypto':
        return SymbolType.CRYPTO
      case 'forex':
        return SymbolType.FOREX
      case 'commodity':
        return SymbolType.COMMODITY
      default:
        throw new Error(`Invalid symbol type: ${type}`)
    }
  }

  isStock(): boolean {
    return this.value === 'stock'
  }

  isCrypto(): boolean {
    return this.value === 'crypto'
  }

  isForex(): boolean {
    return this.value === 'forex'
  }

  isCommodity(): boolean {
    return this.value === 'commodity'
  }

  toString(): 'stock' | 'crypto' | 'forex' | 'commodity' {
    return this.value
  }

  equals(other: SymbolType): boolean {
    return this.value === other.value
  }
}

export class Alert {
  private constructor(
    private readonly _id: string,
    private readonly _symbol: TradingSymbol,
    private readonly _condition: AlertCondition,
    private readonly _targetPrice: number,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _triggeredAt: Date | null = null
  ) {
    this.validate()
  }

  static create(data: {
    id: string
    symbol: string
    condition: 'above' | 'below' | 'crosses_above' | 'crosses_below'
    targetPrice: number
  }): Alert {
    return new Alert(
      data.id,
      TradingSymbol.fromString(data.symbol),
      AlertCondition.fromString(data.condition),
      data.targetPrice,
      true,
      new Date()
    )
  }

  static fromPrimitive(data: {
    id: string
    symbol: string
    condition: 'above' | 'below' | 'crosses_above' | 'crosses_below'
    targetPrice: number
    isActive: boolean
    createdAt: Date
    triggeredAt?: Date
  }): Alert {
    return new Alert(
      data.id,
      TradingSymbol.fromString(data.symbol),
      AlertCondition.fromString(data.condition),
      data.targetPrice,
      data.isActive,
      data.createdAt,
      data.triggeredAt ?? null
    )
  }

  get id(): string {
    return this._id
  }

  get symbol(): TradingSymbol {
    return this._symbol
  }

  get condition(): AlertCondition {
    return this._condition
  }

  get targetPrice(): number {
    return this._targetPrice
  }

  get isActive(): boolean {
    return this._isActive
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get triggeredAt(): Date | null {
    return this._triggeredAt
  }

  get isTriggered(): boolean {
    return this._triggeredAt !== null
  }

  checkTrigger(currentPrice: number, previousPrice: number): boolean {
    if (!this._isActive || this.isTriggered) {
      return false
    }

    let shouldTrigger = false

    switch (this._condition.toString()) {
      case 'above':
        shouldTrigger = currentPrice > this._targetPrice
        break
      case 'below':
        shouldTrigger = currentPrice < this._targetPrice
        break
      case 'crosses_above':
        shouldTrigger = previousPrice <= this._targetPrice && currentPrice > this._targetPrice
        break
      case 'crosses_below':
        shouldTrigger = previousPrice >= this._targetPrice && currentPrice < this._targetPrice
        break
    }

    if (shouldTrigger) {
      this.trigger()
    }

    return shouldTrigger
  }

  trigger(): void {
    if (!this._isActive) {
      throw new Error('Cannot trigger inactive alert')
    }
    if (this.isTriggered) {
      throw new Error('Alert already triggered')
    }

    this._triggeredAt = new Date()
    this._isActive = false
  }

  deactivate(): void {
    this._isActive = false
  }

  activate(): void {
    if (this.isTriggered) {
      throw new Error('Cannot activate triggered alert')
    }
    this._isActive = true
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new Error('Alert ID cannot be empty')
    }
    if (this._targetPrice <= 0) {
      throw new Error('Target price must be positive')
    }
  }

  toPrimitive() {
    return {
      id: this._id,
      symbol: this._symbol.code,
      condition: this._condition.toString(),
      targetPrice: this._targetPrice,
      isActive: this._isActive,
      createdAt: this._createdAt,
      triggeredAt: this._triggeredAt,
    }
  }
}

export class AlertCondition {
  private constructor(
    private readonly value: 'above' | 'below' | 'crosses_above' | 'crosses_below'
  ) {}

  static readonly ABOVE = new AlertCondition('above')
  static readonly BELOW = new AlertCondition('below')
  static readonly CROSSES_ABOVE = new AlertCondition('crosses_above')
  static readonly CROSSES_BELOW = new AlertCondition('crosses_below')

  static fromString(condition: string): AlertCondition {
    switch (condition) {
      case 'above':
        return AlertCondition.ABOVE
      case 'below':
        return AlertCondition.BELOW
      case 'crosses_above':
        return AlertCondition.CROSSES_ABOVE
      case 'crosses_below':
        return AlertCondition.CROSSES_BELOW
      default:
        throw new Error(`Invalid alert condition: ${condition}`)
    }
  }

  isAbove(): boolean {
    return this.value === 'above'
  }

  isBelow(): boolean {
    return this.value === 'below'
  }

  isCrossesAbove(): boolean {
    return this.value === 'crosses_above'
  }

  isCrossesBelow(): boolean {
    return this.value === 'crosses_below'
  }

  requiresPreviousPrice(): boolean {
    return this.value === 'crosses_above' || this.value === 'crosses_below'
  }

  toString(): 'above' | 'below' | 'crosses_above' | 'crosses_below' {
    return this.value
  }

  equals(other: AlertCondition): boolean {
    return this.value === other.value
  }
}

// Legacy type definitions for backward compatibility
export type Symbol = {
  symbol: string
  name: string
  exchange: string
  type: 'stock' | 'crypto' | 'forex' | 'commodity'
  currency: string
  isActive: boolean
}

export type MarketPrice = {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
}

export type NewsItem = {
  id: string
  title: string
  summary: string
  url: string
  publishedAt: Date
  source: string
  symbols: string[]
}
