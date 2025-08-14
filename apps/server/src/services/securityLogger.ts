import { appendFileSync, existsSync, mkdirSync, statSync, renameSync } from 'fs'
import path from 'path'
import { AuthenticatedRequest } from '../middleware/auth'

// Security event types
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_DELETION = 'ACCOUNT_DELETION',

  // Token events
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Authorization events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',

  // Rate limiting events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',

  // Security violations
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',

  // API security
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  CORS_VIOLATION = 'CORS_VIOLATION',
}

// Security event severity levels
export enum SecuritySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Security event interface
export interface SecurityEvent {
  timestamp: string
  eventType: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  endpoint?: string
  method?: string
  statusCode?: number
  message: string
  metadata?: Record<string, any>
  stackTrace?: string
}

// Security logger configuration
interface SecurityLoggerConfig {
  logDir: string
  logFile: string
  enableConsole: boolean
  enableFile: boolean
  minSeverity: SecuritySeverity
  enableAlerts: boolean
  alertWebhook?: string
}

// Severity order for comparison
const SEVERITY_ORDER: Record<SecuritySeverity, number> = {
  [SecuritySeverity.INFO]: 0,
  [SecuritySeverity.WARNING]: 1,
  [SecuritySeverity.HIGH]: 2,
  [SecuritySeverity.CRITICAL]: 3,
}

class SecurityLogger {
  private config: SecurityLoggerConfig
  private logPath: string
  private alertQueue: SecurityEvent[] = []
  private alertTimer: NodeJS.Timeout | null = null

  constructor(config?: Partial<SecurityLoggerConfig>) {
    this.config = {
      logDir: process.env.SECURITY_LOG_DIR || path.join(process.cwd(), 'logs', 'security'),
      logFile: process.env.SECURITY_LOG_FILE || 'security.log',
      enableConsole: process.env.NODE_ENV === 'development',
      enableFile: true,
      minSeverity: (process.env.SECURITY_MIN_SEVERITY as SecuritySeverity) || SecuritySeverity.INFO,
      enableAlerts: process.env.SECURITY_ALERTS_ENABLED === 'true',
      alertWebhook: process.env.SECURITY_ALERT_WEBHOOK,
      ...config,
    }

    this.logPath = path.join(this.config.logDir, this.config.logFile)
    this.ensureLogDirectory()
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.config.logDir)) {
      mkdirSync(this.config.logDir, { recursive: true })
    }
  }

  private shouldLog(severity: SecuritySeverity): boolean {
    return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[this.config.minSeverity]
  }

  private formatEvent(event: SecurityEvent): string {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      serverVersion: process.env.npm_package_version || 'unknown',
    }
    return JSON.stringify(logEntry) + '\n'
  }

  private writeToFile(event: SecurityEvent): void {
    if (!this.config.enableFile) return

    try {
      const formattedEvent = this.formatEvent(event)
      appendFileSync(this.logPath, formattedEvent)

      // Rotate log file if it gets too large (100MB)
      const stats = statSync(this.logPath)
      if (stats.size > 100 * 1024 * 1024) {
        this.rotateLogFile()
      }
    } catch (error) {
      console.error('Failed to write security log:', error)
    }
  }

  private rotateLogFile(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const rotatedPath = path.join(this.config.logDir, `${this.config.logFile}.${timestamp}`)

    try {
      renameSync(this.logPath, rotatedPath)
    } catch (error) {
      console.error('Failed to rotate security log:', error)
    }
  }

  private writeToConsole(event: SecurityEvent): void {
    if (!this.config.enableConsole) return

    const colorMap: Record<SecuritySeverity, string> = {
      [SecuritySeverity.INFO]: '\x1b[36m', // Cyan
      [SecuritySeverity.WARNING]: '\x1b[33m', // Yellow
      [SecuritySeverity.HIGH]: '\x1b[35m', // Magenta
      [SecuritySeverity.CRITICAL]: '\x1b[31m', // Red
    }

    const color = colorMap[event.severity]
    const reset = '\x1b[0m'

    console.log(
      `${color}[SECURITY ${event.severity}]${reset}`,
      `${event.eventType}:`,
      event.message,
      event.metadata || ''
    )
  }

  private async sendAlert(event: SecurityEvent): Promise<void> {
    if (!this.config.enableAlerts || !this.config.alertWebhook) return

    // Only alert for HIGH and CRITICAL severity
    if (SEVERITY_ORDER[event.severity] < SEVERITY_ORDER[SecuritySeverity.HIGH]) return

    // Add to alert queue
    this.alertQueue.push(event)

    // Batch alerts (send after 5 seconds of no new alerts)
    if (this.alertTimer) {
      clearTimeout(this.alertTimer)
    }

    this.alertTimer = setTimeout(() => {
      this.flushAlerts()
    }, 5000)
  }

  private async flushAlerts(): Promise<void> {
    if (this.alertQueue.length === 0) return

    const alerts = [...this.alertQueue]
    this.alertQueue = []

    try {
      // In production, send to webhook/monitoring service
      if (process.env.NODE_ENV === 'production' && this.config.alertWebhook) {
        await fetch(this.config.alertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alerts,
            summary: `${alerts.length} security event(s) detected`,
            timestamp: new Date().toISOString(),
          }),
        })
      }
    } catch (error) {
      console.error('Failed to send security alerts:', error)
    }
  }

  public log(
    event: Partial<SecurityEvent> & { eventType: SecurityEventType; message: string }
  ): void {
    const fullEvent: SecurityEvent = {
      timestamp: new Date().toISOString(),
      severity: SecuritySeverity.INFO,
      ...event,
    }

    if (!this.shouldLog(fullEvent.severity)) return

    this.writeToFile(fullEvent)
    this.writeToConsole(fullEvent)
    this.sendAlert(fullEvent)
  }

  public logRequest(
    req: AuthenticatedRequest,
    eventType: SecurityEventType,
    message: string,
    severity: SecuritySeverity = SecuritySeverity.INFO,
    metadata?: Record<string, any>
  ): void {
    this.log({
      eventType,
      severity,
      message,
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      metadata,
    })
  }

  public logAuthSuccess(req: AuthenticatedRequest, userId: string, email: string): void {
    this.logRequest(
      req,
      SecurityEventType.LOGIN_SUCCESS,
      `Successful login for user ${email}`,
      SecuritySeverity.INFO,
      { userId, email }
    )
  }

  public logAuthFailure(req: AuthenticatedRequest, email: string, reason: string): void {
    this.logRequest(
      req,
      SecurityEventType.LOGIN_FAILURE,
      `Failed login attempt for ${email}: ${reason}`,
      SecuritySeverity.WARNING,
      { email, reason }
    )
  }

  public logUnauthorizedAccess(req: AuthenticatedRequest, reason: string): void {
    this.logRequest(
      req,
      SecurityEventType.UNAUTHORIZED_ACCESS,
      `Unauthorized access attempt: ${reason}`,
      SecuritySeverity.HIGH,
      { reason }
    )
  }

  public logRateLimitExceeded(req: AuthenticatedRequest, identifier: string): void {
    this.logRequest(
      req,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded for ${identifier}`,
      SecuritySeverity.WARNING,
      { identifier }
    )
  }

  public logSuspiciousActivity(req: AuthenticatedRequest, activity: string, details?: any): void {
    this.logRequest(
      req,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      `Suspicious activity detected: ${activity}`,
      SecuritySeverity.CRITICAL,
      { activity, details }
    )
  }

  public logSecurityViolation(
    req: AuthenticatedRequest,
    violationType: SecurityEventType,
    details: string
  ): void {
    this.logRequest(
      req,
      violationType,
      `Security violation detected: ${details}`,
      SecuritySeverity.CRITICAL,
      { violationType, details }
    )
  }

  // Get security metrics for monitoring
  public async getMetrics(): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    recentEvents: SecurityEvent[]
  }> {
    // In production, this would query from a database
    // For now, return mock metrics
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsBySeverity: {},
      recentEvents: [],
    }
  }

  // Clean up old logs (retention policy)
  public async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // In production, implement log cleanup based on retention policy
    console.log(`Cleaning up logs older than ${cutoffDate.toISOString()}`)
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger()

// Export for testing
export default SecurityLogger
