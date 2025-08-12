/**
 * Centralized constants for the application
 * Import and re-export new constant modules
 */

export * from './timeouts'
export * from './limits'
export * from './chart'

// Existing timeframes with enhanced structure
export const TIMEFRAMES = {
  '1': { label: '1min', seconds: 60 },
  '5': { label: '5min', seconds: 300 },
  '15': { label: '15min', seconds: 900 },
  '30': { label: '30min', seconds: 1800 },
  '60': { label: '1hour', seconds: 3600 },
  D: { label: '1day', seconds: 86400 },
  W: { label: '1week', seconds: 604800 },
  M: { label: '1month', seconds: 2592000 },
} as const

export const CHART_TYPES = {
  candlestick: 'Candlestick',
  line: 'Line',
  bar: 'Bar',
  area: 'Area',
} as const

export const THEMES = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
} as const

export const API_ENDPOINTS = {
  SYMBOLS_SEARCH: '/api/symbols/search',
  MARKET_QUOTE: '/api/market/quote',
  MARKET_CANDLES: '/api/market/candles',
  COMPANY_PROFILE: '/api/market/company',
} as const

export const WEBSOCKET_EVENTS = {
  QUOTE: 'quote',
  CANDLE: 'candle',
  ERROR: 'error',
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
  PONG: 'pong',
} as const

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed',
  API_RATE_LIMIT: 'API rate limit exceeded',
  INVALID_SYMBOL: 'Invalid symbol format',
  DATA_NOT_FOUND: 'No data found for the requested symbol',
  DATABASE_ERROR: 'Database operation failed',
  AUTHENTICATION_ERROR: 'Authentication failed',
  VALIDATION_ERROR: 'Invalid request data',
  WEBSOCKET_CONNECTION_FAILED: 'WebSocket connection failed',
  CIRCUIT_BREAKER_OPEN: 'Service temporarily unavailable',
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

// Environment constants
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const

// Drawing tool types
export const DRAWING_TOOLS = {
  TRENDLINE: 'trendline',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
  ARROW: 'arrow',
} as const
