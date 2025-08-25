// Order-related types
export type OrderType =
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop_limit'
  | 'trailing_stop'
  | 'bracket'
  | 'oco' // One Cancels Other
  | 'iceberg'

export type OrderSide = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'expired'
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok' // Good Till Cancelled, Immediate Or Cancel, Fill Or Kill

export interface BaseOrder {
  id: string
  symbol: string
  side: OrderSide
  quantity: number
  type: OrderType
  status: OrderStatus
  timeInForce: TimeInForce
  createdAt: number
  updatedAt: number
  expiresAt?: number
  userId?: string
  simulationId?: string
}

export interface MarketOrder extends BaseOrder {
  type: 'market'
}

export interface LimitOrder extends BaseOrder {
  type: 'limit'
  price: number
}

export interface StopOrder extends BaseOrder {
  type: 'stop'
  stopPrice: number
}

export interface StopLimitOrder extends BaseOrder {
  type: 'stop_limit'
  stopPrice: number
  limitPrice: number
}

export interface TrailingStopOrder extends BaseOrder {
  type: 'trailing_stop'
  trailAmount: number
  trailPercent?: number
  highWaterMark?: number // For sell orders
  lowWaterMark?: number // For buy orders
}

export interface BracketOrder extends BaseOrder {
  type: 'bracket'
  price: number
  takeProfitPrice?: number
  stopLossPrice?: number
  childOrders: string[] // IDs of child orders
  parentOrderId?: string
}

export interface OCOOrder extends BaseOrder {
  type: 'oco'
  orders: [LimitOrder | StopOrder, LimitOrder | StopOrder]
  filledOrderId?: string
}

export interface IcebergOrder extends BaseOrder {
  type: 'iceberg'
  price: number
  displayQuantity: number
  remainingQuantity: number
}

export type Order =
  | MarketOrder
  | LimitOrder
  | StopOrder
  | StopLimitOrder
  | TrailingStopOrder
  | BracketOrder
  | OCOOrder
  | IcebergOrder

export interface OrderExecution {
  id: string
  orderId: string
  symbol: string
  side: OrderSide
  quantity: number
  price: number
  timestamp: number
  commission: number
  fees: number
  slippage: number
}

export interface OrderValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface OrderValidationContext {
  portfolio: any // Will be imported from portfolio.ts
  marketHours: boolean
  allowShortSelling: boolean
  maxLeverage: number
}
