// Portfolio and position management types
import type { Order, OrderExecution } from './orders'

export interface Position {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
  side: 'long' | 'short'
  openedAt: number
  updatedAt: number
  closedAt?: number
  stopLoss?: number
  takeProfit?: number
  margin?: number
  leverage?: number
}

export interface Portfolio {
  id: string
  name: string
  initialBalance: number
  currentBalance: number
  totalPnL: number
  unrealizedPnL: number
  realizedPnL: number
  positions: Position[]
  orders: Order[]
  executions: OrderExecution[]
  marginUsed: number
  availableMargin: number
  portfolioValue: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  createdAt: number
  updatedAt: number
}

export interface AccountBalance {
  cash: number
  marginUsed: number
  marginAvailable: number
  unrealizedPnL: number
  realizedPnL: number
  equity: number
  maintenanceMargin: number
}

export interface PortfolioMetrics {
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
}

export interface RiskMetrics {
  var95: number // Value at Risk at 95% confidence
  var99: number // Value at Risk at 99% confidence
  beta: number
  alpha: number
  correlation: number
  volatility: number
}
