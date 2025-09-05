export class Order {
  private constructor(
    private readonly _id: string,
    private readonly _symbol: Symbol,
    private readonly _type: OrderType,
    private readonly _side: OrderSide,
    private readonly _quantity: number,
    private readonly _price: number | null,
    private _status: OrderStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _executedAt: Date | null = null,
    private _executedPrice: number | null = null,
    private _executedQuantity: number = 0
  ) {
    this.validate()
  }

  static create(data: {
    id: string
    symbol: string
    type: 'market' | 'limit' | 'stop' | 'stopLimit'
    side: 'buy' | 'sell'
    quantity: number
    price?: number
  }): Order {
    const now = new Date()
    return new Order(
      data.id,
      Symbol.fromString(data.symbol),
      OrderType.fromString(data.type),
      OrderSide.fromString(data.side),
      data.quantity,
      data.price ?? null,
      OrderStatus.PENDING,
      now,
      now
    )
  }

  static fromPrimitive(data: {
    id: string
    symbol: string
    type: 'market' | 'limit' | 'stop' | 'stopLimit'
    side: 'buy' | 'sell'
    quantity: number
    price: number | null
    status: 'pending' | 'filled' | 'partiallyFilled' | 'cancelled' | 'rejected'
    createdAt: Date
    updatedAt: Date
    executedAt: Date | null
    executedPrice: number | null
    executedQuantity: number
  }): Order {
    return new Order(
      data.id,
      Symbol.fromString(data.symbol),
      OrderType.fromString(data.type),
      OrderSide.fromString(data.side),
      data.quantity,
      data.price,
      OrderStatus.fromString(data.status),
      data.createdAt,
      data.updatedAt,
      data.executedAt,
      data.executedPrice,
      data.executedQuantity
    )
  }

  get id(): string {
    return this._id
  }

  get symbol(): Symbol {
    return this._symbol
  }

  get type(): OrderType {
    return this._type
  }

  get side(): OrderSide {
    return this._side
  }

  get quantity(): number {
    return this._quantity
  }

  get price(): number | null {
    return this._price
  }

  get status(): OrderStatus {
    return this._status
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  get executedAt(): Date | null {
    return this._executedAt
  }

  get executedPrice(): number | null {
    return this._executedPrice
  }

  get executedQuantity(): number {
    return this._executedQuantity
  }

  get remainingQuantity(): number {
    return this._quantity - this._executedQuantity
  }

  get isMarketOrder(): boolean {
    return this._type.isMarket()
  }

  get isLimitOrder(): boolean {
    return this._type.isLimit()
  }

  get isBuyOrder(): boolean {
    return this._side.isBuy()
  }

  get isSellOrder(): boolean {
    return this._side.isSell()
  }

  execute(price: number, quantity: number): void {
    if (!this._status.canExecute()) {
      throw new Error(`Cannot execute order with status: ${this._status.toString()}`)
    }

    if (quantity <= 0 || quantity > this.remainingQuantity) {
      throw new Error(`Invalid execution quantity: ${quantity}`)
    }

    if (price <= 0) {
      throw new Error(`Invalid execution price: ${price}`)
    }

    this._executedPrice = price
    this._executedQuantity += quantity
    this._executedAt = new Date()
    this._updatedAt = new Date()

    if (this._executedQuantity === this._quantity) {
      this._status = OrderStatus.FILLED
    } else {
      this._status = OrderStatus.PARTIALLY_FILLED
    }
  }

  cancel(): void {
    if (!this._status.canCancel()) {
      throw new Error(`Cannot cancel order with status: ${this._status.toString()}`)
    }

    this._status = OrderStatus.CANCELLED
    this._updatedAt = new Date()
  }

  reject(_reason?: string): void {
    if (!this._status.canReject()) {
      throw new Error(`Cannot reject order with status: ${this._status.toString()}`)
    }

    this._status = OrderStatus.REJECTED
    this._updatedAt = new Date()
  }

  getNotionalValue(): number {
    if (this._type.isMarket()) {
      return 0 // Market orders don't have a predefined notional value
    }
    return (this._price ?? 0) * this._quantity
  }

  getExecutedNotionalValue(): number {
    return (this._executedPrice ?? 0) * this._executedQuantity
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new Error('Order ID cannot be empty')
    }

    if (this._quantity <= 0) {
      throw new Error('Order quantity must be positive')
    }

    if (this._type.requiresPrice() && (this._price === null || this._price <= 0)) {
      throw new Error(`${this._type.toString()} orders require a positive price`)
    }

    if (this._executedQuantity < 0) {
      throw new Error('Executed quantity cannot be negative')
    }

    if (this._executedQuantity > this._quantity) {
      throw new Error('Executed quantity cannot exceed order quantity')
    }
  }

  toPrimitive() {
    return {
      id: this._id,
      symbol: this._symbol.toString(),
      type: this._type.toString(),
      side: this._side.toString(),
      quantity: this._quantity,
      price: this._price,
      status: this._status.toString(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      executedAt: this._executedAt,
      executedPrice: this._executedPrice,
      executedQuantity: this._executedQuantity,
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

export class OrderType {
  private constructor(private readonly value: 'market' | 'limit' | 'stop' | 'stopLimit') {}

  static readonly MARKET = new OrderType('market')
  static readonly LIMIT = new OrderType('limit')
  static readonly STOP = new OrderType('stop')
  static readonly STOP_LIMIT = new OrderType('stopLimit')

  static fromString(type: string): OrderType {
    switch (type) {
      case 'market':
        return OrderType.MARKET
      case 'limit':
        return OrderType.LIMIT
      case 'stop':
        return OrderType.STOP
      case 'stopLimit':
        return OrderType.STOP_LIMIT
      default:
        throw new Error(`Invalid order type: ${type}`)
    }
  }

  isMarket(): boolean {
    return this.value === 'market'
  }

  isLimit(): boolean {
    return this.value === 'limit'
  }

  isStop(): boolean {
    return this.value === 'stop'
  }

  isStopLimit(): boolean {
    return this.value === 'stopLimit'
  }

  requiresPrice(): boolean {
    return this.value !== 'market'
  }

  toString(): 'market' | 'limit' | 'stop' | 'stopLimit' {
    return this.value
  }

  equals(other: OrderType): boolean {
    return this.value === other.value
  }
}

export class OrderSide {
  private constructor(private readonly value: 'buy' | 'sell') {}

  static readonly BUY = new OrderSide('buy')
  static readonly SELL = new OrderSide('sell')

  static fromString(side: string): OrderSide {
    switch (side) {
      case 'buy':
        return OrderSide.BUY
      case 'sell':
        return OrderSide.SELL
      default:
        throw new Error(`Invalid order side: ${side}`)
    }
  }

  isBuy(): boolean {
    return this.value === 'buy'
  }

  isSell(): boolean {
    return this.value === 'sell'
  }

  toString(): 'buy' | 'sell' {
    return this.value
  }

  equals(other: OrderSide): boolean {
    return this.value === other.value
  }
}

export class OrderStatus {
  private constructor(
    private readonly value: 'pending' | 'filled' | 'partiallyFilled' | 'cancelled' | 'rejected'
  ) {}

  static readonly PENDING = new OrderStatus('pending')
  static readonly FILLED = new OrderStatus('filled')
  static readonly PARTIALLY_FILLED = new OrderStatus('partiallyFilled')
  static readonly CANCELLED = new OrderStatus('cancelled')
  static readonly REJECTED = new OrderStatus('rejected')

  static fromString(status: string): OrderStatus {
    switch (status) {
      case 'pending':
        return OrderStatus.PENDING
      case 'filled':
        return OrderStatus.FILLED
      case 'partiallyFilled':
        return OrderStatus.PARTIALLY_FILLED
      case 'cancelled':
        return OrderStatus.CANCELLED
      case 'rejected':
        return OrderStatus.REJECTED
      default:
        throw new Error(`Invalid order status: ${status}`)
    }
  }

  isPending(): boolean {
    return this.value === 'pending'
  }

  isFilled(): boolean {
    return this.value === 'filled'
  }

  isPartiallyFilled(): boolean {
    return this.value === 'partiallyFilled'
  }

  isCancelled(): boolean {
    return this.value === 'cancelled'
  }

  isRejected(): boolean {
    return this.value === 'rejected'
  }

  canExecute(): boolean {
    return this.value === 'pending' || this.value === 'partiallyFilled'
  }

  canCancel(): boolean {
    return this.value === 'pending' || this.value === 'partiallyFilled'
  }

  canReject(): boolean {
    return this.value === 'pending'
  }

  isFinalStatus(): boolean {
    return this.value === 'filled' || this.value === 'cancelled' || this.value === 'rejected'
  }

  toString(): 'pending' | 'filled' | 'partiallyFilled' | 'cancelled' | 'rejected' {
    return this.value
  }

  equals(other: OrderStatus): boolean {
    return this.value === other.value
  }
}

export class Portfolio {
  private constructor(
    private readonly _userId: string,
    private readonly _positions: Map<string, Position>,
    private _totalValue: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(userId: string): Portfolio {
    const now = new Date()
    return new Portfolio(userId, new Map(), 0, now, now)
  }

  static fromPrimitive(data: {
    userId: string
    positions: Array<{
      symbol: string
      quantity: number
      averagePrice: number
      totalCost: number
      currentPrice: number
      unrealizedPnL: number
      realizedPnL: number
      createdAt: Date
      updatedAt: Date
    }>
    totalValue: number
    createdAt: Date
    updatedAt: Date
  }): Portfolio {
    const positions = new Map<string, Position>()
    data.positions.forEach(pos => {
      positions.set(pos.symbol, Position.fromPrimitive(pos))
    })

    return new Portfolio(data.userId, positions, data.totalValue, data.createdAt, data.updatedAt)
  }

  get userId(): string {
    return this._userId
  }

  get positions(): ReadonlyMap<string, Position> {
    return new Map(this._positions)
  }

  get totalValue(): number {
    return this._totalValue
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  addPosition(order: Order, currentPrice: number): void {
    const symbol = order.symbol.toString()
    const existingPosition = this._positions.get(symbol)

    if (existingPosition) {
      existingPosition.addOrder(order, currentPrice)
    } else {
      const newPosition = Position.fromOrder(order, currentPrice)
      this._positions.set(symbol, newPosition)
    }

    this.updateTotalValue()
    this._updatedAt = new Date()
  }

  removePosition(symbol: string): void {
    this._positions.delete(symbol)
    this.updateTotalValue()
    this._updatedAt = new Date()
  }

  getPosition(symbol: string): Position | null {
    return this._positions.get(symbol) ?? null
  }

  hasPosition(symbol: string): boolean {
    return this._positions.has(symbol)
  }

  getTotalUnrealizedPnL(): number {
    return Array.from(this._positions.values()).reduce(
      (total, position) => total + position.unrealizedPnL,
      0
    )
  }

  getTotalRealizedPnL(): number {
    return Array.from(this._positions.values()).reduce(
      (total, position) => total + position.realizedPnL,
      0
    )
  }

  updatePrices(prices: Map<string, number>): void {
    let updated = false
    for (const [symbol, position] of this._positions) {
      const newPrice = prices.get(symbol)
      if (newPrice !== undefined) {
        position.updateCurrentPrice(newPrice)
        updated = true
      }
    }

    if (updated) {
      this.updateTotalValue()
      this._updatedAt = new Date()
    }
  }

  private updateTotalValue(): void {
    this._totalValue = Array.from(this._positions.values()).reduce(
      (total, position) => total + position.currentValue,
      0
    )
  }

  toPrimitive() {
    return {
      userId: this._userId,
      positions: Array.from(this._positions.values()).map(p => p.toPrimitive()),
      totalValue: this._totalValue,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    }
  }
}

export class Position {
  private constructor(
    private readonly _symbol: Symbol,
    private _quantity: number,
    private _averagePrice: number,
    private _totalCost: number,
    private _currentPrice: number,
    private _unrealizedPnL: number,
    private _realizedPnL: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static fromOrder(order: Order, currentPrice: number): Position {
    if (!order.executedPrice || order.executedQuantity === 0) {
      throw new Error('Cannot create position from unexecuted order')
    }

    const quantity = order.isBuyOrder ? order.executedQuantity : -order.executedQuantity
    const totalCost = order.executedPrice * order.executedQuantity
    const unrealizedPnL = (currentPrice - order.executedPrice) * Math.abs(quantity)

    const now = new Date()
    return new Position(
      order.symbol,
      quantity,
      order.executedPrice,
      totalCost,
      currentPrice,
      unrealizedPnL,
      0,
      now,
      now
    )
  }

  static fromPrimitive(data: {
    symbol: string
    quantity: number
    averagePrice: number
    totalCost: number
    currentPrice: number
    unrealizedPnL: number
    realizedPnL: number
    createdAt: Date
    updatedAt: Date
  }): Position {
    return new Position(
      Symbol.fromString(data.symbol),
      data.quantity,
      data.averagePrice,
      data.totalCost,
      data.currentPrice,
      data.unrealizedPnL,
      data.realizedPnL,
      data.createdAt,
      data.updatedAt
    )
  }

  get symbol(): Symbol {
    return this._symbol
  }

  get quantity(): number {
    return this._quantity
  }

  get averagePrice(): number {
    return this._averagePrice
  }

  get totalCost(): number {
    return this._totalCost
  }

  get currentPrice(): number {
    return this._currentPrice
  }

  get currentValue(): number {
    return Math.abs(this._quantity) * this._currentPrice
  }

  get unrealizedPnL(): number {
    return this._unrealizedPnL
  }

  get realizedPnL(): number {
    return this._realizedPnL
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  get isLong(): boolean {
    return this._quantity > 0
  }

  get isShort(): boolean {
    return this._quantity < 0
  }

  get isEmpty(): boolean {
    return this._quantity === 0
  }

  addOrder(order: Order, currentPrice: number): void {
    if (!order.executedPrice || order.executedQuantity === 0) {
      throw new Error('Cannot add unexecuted order to position')
    }

    const orderQuantity = order.isBuyOrder ? order.executedQuantity : -order.executedQuantity
    const orderCost = order.executedPrice * order.executedQuantity

    // Check if this is a closing order
    if ((this._quantity > 0 && orderQuantity < 0) || (this._quantity < 0 && orderQuantity > 0)) {
      // Closing order - calculate realized P&L
      const closingQuantity = Math.min(Math.abs(this._quantity), Math.abs(orderQuantity))
      const realizedPnL =
        (order.executedPrice - this._averagePrice) * closingQuantity * Math.sign(this._quantity)
      this._realizedPnL += realizedPnL
    }

    // Update position
    const newQuantity = this._quantity + orderQuantity
    if (newQuantity === 0) {
      // Position closed
      this._quantity = 0
      this._averagePrice = 0
      this._totalCost = 0
    } else if (Math.sign(newQuantity) === Math.sign(this._quantity) || this._quantity === 0) {
      // Adding to existing position or opening new position
      const newTotalCost = this._totalCost + orderCost * Math.sign(orderQuantity)
      this._averagePrice = Math.abs(newTotalCost / newQuantity)
      this._totalCost = newTotalCost
      this._quantity = newQuantity
    } else {
      // Position reversed
      this._quantity = newQuantity
      this._averagePrice = order.executedPrice
      this._totalCost = Math.abs(orderCost * Math.sign(newQuantity))
    }

    this.updateCurrentPrice(currentPrice)
    this._updatedAt = new Date()
  }

  updateCurrentPrice(price: number): void {
    if (price <= 0) {
      throw new Error('Current price must be positive')
    }

    this._currentPrice = price
    if (this._quantity !== 0) {
      this._unrealizedPnL = (price - this._averagePrice) * this._quantity
    } else {
      this._unrealizedPnL = 0
    }
  }

  toPrimitive() {
    return {
      symbol: this._symbol.toString(),
      quantity: this._quantity,
      averagePrice: this._averagePrice,
      totalCost: this._totalCost,
      currentPrice: this._currentPrice,
      unrealizedPnL: this._unrealizedPnL,
      realizedPnL: this._realizedPnL,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    }
  }
}
