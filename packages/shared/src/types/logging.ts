export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type LogContext = {
  requestId?: string
  userId?: string
  sessionId?: string
  symbol?: string
  operation?: string
  duration?: number
  httpStatus?: number
  userAgent?: string
  ip?: string
  [key: string]: unknown
}

export type LogEntry = {
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error
  timestamp?: Date
}

export type LoggerConfig = {
  level: LogLevel
  environment: 'development' | 'staging' | 'production'
  pretty: boolean
  redactPaths?: string[]
  destination?: string
}

// ログカテゴリの定義
export type LogCategory =
  | 'auth'
  | 'api'
  | 'database'
  | 'market-data'
  | 'websocket'
  | 'security'
  | 'performance'
  | 'business'
  | 'system'
  | 'audit'

export type StructuredLogEntry = LogEntry & {
  category: LogCategory
  component: string
  version?: string
  environment?: string
  hostname?: string
  pid?: number
}
