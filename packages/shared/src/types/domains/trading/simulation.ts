// Trading simulation types
import type { Portfolio } from './portfolio'

export interface TradingSimulation {
  id: string
  userId: string
  name: string
  portfolio: Portfolio
  startDate: number
  endDate?: number
  status: 'running' | 'paused' | 'completed' | 'cancelled'
  settings: SimulationSettings
  results?: SimulationResults
  createdAt: number
  updatedAt: number
}

export interface SimulationSettings {
  initialBalance: number
  allowShortSelling: boolean
  marginEnabled: boolean
  maxLeverage: number
  commissionRate: number
  slippageModel: 'none' | 'fixed' | 'percentage' | 'market_impact'
  slippageValue?: number
  fillProbability: number // For limit orders
  realisticFills: boolean
  stopOnMarginCall: boolean
  tradingHours: 'market' | '24/7' | 'custom'
  customHours?: {
    start: string
    end: string
    timezone: string
  }
}

export interface SimulationResults {
  totalReturn: number
  totalReturnPercent: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  averageWin: number
  averageLoss: number
  bestTrade: TradeResult
  worstTrade: TradeResult
  longestWinStreak: number
  longestLossStreak: number
  averageHoldingPeriod: number
  exposureTime: number // Percentage of time with open positions
}

export interface TradeResult {
  symbol: string
  entryPrice: number
  exitPrice: number
  quantity: number
  side: 'long' | 'short'
  entryTime: number
  exitTime: number
  pnl: number
  pnlPercent: number
  commission: number
  slippage: number
}

export interface BacktestConfig {
  strategy: TradingStrategy
  symbols: string[]
  timeframe: string
  startDate: string
  endDate: string
  initialBalance: number
  settings: SimulationSettings
}

export interface TradingStrategy {
  id: string
  name: string
  description: string
  type: 'technical' | 'fundamental' | 'hybrid' | 'ml'
  parameters: Record<string, any>
  entryRules: StrategyRule[]
  exitRules: StrategyRule[]
  riskManagement: RiskManagementRules
}

export interface StrategyRule {
  id: string
  type: 'indicator' | 'price' | 'volume' | 'time' | 'custom'
  condition: string
  params: Record<string, any>
  weight?: number
}

export interface RiskManagementRules {
  positionSizing: 'fixed' | 'percentage' | 'kelly' | 'volatility'
  maxPositionSize: number
  maxPortfolioRisk: number
  stopLossType: 'fixed' | 'percentage' | 'atr' | 'trailing'
  stopLossValue: number
  takeProfitType: 'fixed' | 'percentage' | 'atr' | 'risk_reward'
  takeProfitValue: number
  maxOpenPositions: number
  correlationLimit: number
}
