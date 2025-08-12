/**
 * Application timeout constants
 * Centralized management of all timeout values
 */

// WebSocket timeouts
export const WEBSOCKET_TIMEOUTS = {
  PING_INTERVAL: 30_000, // 30 seconds
  CONNECTION_TIMEOUT: 10_000, // 10 seconds
  RECONNECT_DELAY: 5_000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 25_000, // 25 seconds
} as const

// API request timeouts
export const API_TIMEOUTS = {
  DEFAULT_REQUEST: 10_000, // 10 seconds
  LONG_POLLING: 30_000, // 30 seconds
  FILE_UPLOAD: 60_000, // 1 minute
  SEARCH_DEBOUNCE: 300, // 300ms
} as const

// Cache timeouts (in seconds)
export const CACHE_TIMEOUTS = {
  QUOTE_TTL: 5, // 5 seconds
  CANDLE_TTL: 30, // 30 seconds
  SYMBOL_TTL: 300, // 5 minutes
  USER_PREFERENCES_TTL: 600, // 10 minutes
} as const

// Session timeouts
export const SESSION_TIMEOUTS = {
  ACCESS_TOKEN_TTL: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
} as const

// Error handling timeouts
export const ERROR_TIMEOUTS = {
  NOTIFICATION_DURATION: 5_000, // 5 seconds
  SUCCESS_NOTIFICATION: 3_000, // 3 seconds
  WARNING_NOTIFICATION: 4_000, // 4 seconds
  ERROR_NOTIFICATION: 8_000, // 8 seconds
} as const

// Resource pool timeouts
export const RESOURCE_TIMEOUTS = {
  MAX_USAGE_TIME: 30 * 60 * 1000, // 30 minutes
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  VALIDATION_TIMEOUT: 1_000, // 1 second
} as const

// Circuit breaker timeouts
export const CIRCUIT_BREAKER_TIMEOUTS = {
  OPEN_STATE_TIMEOUT: 60_000, // 1 minute
  MONITORING_PERIOD: 10_000, // 10 seconds
  FAILURE_THRESHOLD: 5,
} as const

// Animation and UI timeouts
export const UI_TIMEOUTS = {
  DEBOUNCE_DELAY: 300, // 300ms
  THROTTLE_DELAY: 100, // 100ms
  ANIMATION_DURATION: 200, // 200ms
  TOOLTIP_DELAY: 500, // 500ms
  MODAL_TRANSITION: 150, // 150ms
  DEFAULT_COMMAND: 30000, // 30 seconds - default command execution timeout
} as const