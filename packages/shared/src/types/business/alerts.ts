// Alert and notification business logic types
export type AlertType = 'price' | 'volume' | 'indicator' | 'pattern' | 'news' | 'portfolio'
export type AlertCondition =
  | 'above'
  | 'below'
  | 'crosses_above'
  | 'crosses_below'
  | 'equals'
  | 'changes'
export type AlertStatus = 'active' | 'triggered' | 'paused' | 'expired' | 'deleted'
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

export interface BaseAlert {
  id: string
  userId: string
  name: string
  type: AlertType
  status: AlertStatus
  priority: AlertPriority
  symbol?: string
  message: string
  createdAt: number
  updatedAt: number
  triggeredAt?: number
  expiresAt?: number
  triggerCount: number
  maxTriggers?: number
  isRecurring: boolean
  notificationMethods: Array<'email' | 'push' | 'sms' | 'webhook'>
}

// Price alerts
export interface PriceAlert extends BaseAlert {
  type: 'price'
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below'
  targetPrice: number
  currentPrice?: number
}

// Volume alerts
export interface VolumeAlert extends BaseAlert {
  type: 'volume'
  condition: 'above' | 'below'
  targetVolume: number
  period: '1m' | '5m' | '15m' | '1h' | '1D'
  currentVolume?: number
}

// Technical indicator alerts
export interface IndicatorAlert extends BaseAlert {
  type: 'indicator'
  indicator: {
    type: string
    parameters: Record<string, any>
  }
  condition: AlertCondition
  targetValue: number
  currentValue?: number
}

// Pattern alerts
export interface PatternAlert extends BaseAlert {
  type: 'pattern'
  pattern: {
    type: string
    confidence: number
  }
  detected?: boolean
}

// Portfolio alerts
export interface PortfolioAlert extends BaseAlert {
  type: 'portfolio'
  trigger: 'pnl_above' | 'pnl_below' | 'margin_call' | 'position_size'
  threshold: number
  currentValue?: number
}

export type Alert = PriceAlert | VolumeAlert | IndicatorAlert | PatternAlert | PortfolioAlert

// Alert creation requests
export interface CreateAlertRequest {
  name: string
  type: AlertType
  symbol?: string
  message: string
  priority?: AlertPriority
  expiresAt?: number
  maxTriggers?: number
  isRecurring?: boolean
  notificationMethods?: Array<'email' | 'push' | 'sms' | 'webhook'>

  // Type-specific fields
  condition?: AlertCondition
  targetPrice?: number
  targetVolume?: number
  period?: string
  indicator?: {
    type: string
    parameters: Record<string, any>
  }
  targetValue?: number
  pattern?: {
    type: string
    confidence: number
  }
  trigger?: string
  threshold?: number
}

// Alert notifications
export interface AlertNotification {
  id: string
  alertId: string
  userId: string
  method: 'email' | 'push' | 'sms' | 'webhook'
  status: 'pending' | 'sent' | 'failed' | 'delivered'
  sentAt?: number
  deliveredAt?: number
  errorMessage?: string
  retryCount: number
  metadata?: Record<string, any>
}

// Alert history
export interface AlertTriggerHistory {
  id: string
  alertId: string
  triggeredAt: number
  value: number
  condition: string
  message: string
  notificationsSent: number
  metadata?: Record<string, any>
}

// Alert statistics
export interface AlertStatistics {
  total: number
  active: number
  triggered: number
  paused: number
  expired: number
  averageResponseTime: number
  triggerRate: number
  notificationSuccessRate: number
  topSymbols: Array<{
    symbol: string
    count: number
  }>
  topTypes: Array<{
    type: AlertType
    count: number
  }>
}
