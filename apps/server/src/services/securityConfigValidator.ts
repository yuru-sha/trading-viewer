import { config } from '../config/environment'
import { securityLogger, SecurityEventType, SecuritySeverity } from './securityLogger'

// Security configuration validation rules
interface SecurityRule {
  name: string
  category: 'critical' | 'high' | 'medium' | 'low'
  description: string
  check: () => Promise<{ valid: boolean; message?: string; value?: any }>
  remediation: string
}

// Security configuration categories
export enum SecurityCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  ENCRYPTION = 'encryption',
  HEADERS = 'headers',
  CORS = 'cors',
  RATE_LIMITING = 'rate_limiting',
  LOGGING = 'logging',
  DATABASE = 'database',
  SESSION = 'session',
  ENVIRONMENT = 'environment',
}

export class SecurityConfigValidator {
  private rules: SecurityRule[] = []
  private validationResults: Map<string, any> = new Map()

  constructor() {
    this.initializeRules()
  }

  private initializeRules(): void {
    // Authentication Rules
    this.addRule({
      name: 'jwt_secret_strength',
      category: 'critical',
      description: 'JWT secret must be strong and unique',
      check: async () => {
        const jwtSecret = process.env.JWT_SECRET

        if (!jwtSecret) {
          return { valid: false, message: 'JWT_SECRET not set' }
        }

        if (jwtSecret.includes('default') || jwtSecret.includes('change')) {
          return { valid: false, message: 'Using default JWT_SECRET' }
        }

        if (jwtSecret.length < 32) {
          return { valid: false, message: `JWT_SECRET too short (${jwtSecret.length} < 32)` }
        }

        // Check entropy (simplified)
        const uniqueChars = new Set(jwtSecret).size
        if (uniqueChars < 16) {
          return { valid: false, message: 'JWT_SECRET has low entropy' }
        }

        return { valid: true, value: '***masked***' }
      },
      remediation: 'Generate a cryptographically secure JWT secret with at least 32 characters',
    })

    this.addRule({
      name: 'bcrypt_rounds',
      category: 'high',
      description: 'Bcrypt rounds should be appropriate for security',
      check: async () => {
        const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)

        if (rounds < 10) {
          return { valid: false, message: `Bcrypt rounds too low (${rounds} < 10)`, value: rounds }
        }

        if (rounds > 15) {
          return { valid: false, message: `Bcrypt rounds too high (${rounds} > 15)`, value: rounds }
        }

        return { valid: true, value: rounds }
      },
      remediation: 'Set BCRYPT_SALT_ROUNDS between 10-15 (recommended: 12)',
    })

    // Database Security Rules
    this.addRule({
      name: 'database_url_security',
      category: 'critical',
      description: 'Database URL should be properly secured',
      check: async () => {
        const dbUrl = process.env.DATABASE_URL

        if (!dbUrl) {
          return { valid: false, message: 'DATABASE_URL not set' }
        }

        // Check for common insecure patterns
        if (dbUrl.includes('localhost') && config.isProduction) {
          return { valid: false, message: 'Database URL uses localhost in production' }
        }

        if (
          !dbUrl.startsWith('postgresql://') &&
          !dbUrl.startsWith('postgres://') &&
          !dbUrl.includes(':memory:')
        ) {
          return { valid: false, message: 'Database URL uses potentially insecure protocol' }
        }

        // Check for embedded passwords (security issue)
        if (dbUrl.includes('@') && !dbUrl.includes('sslmode=require') && config.isProduction) {
          return { valid: false, message: 'Database connection should use SSL in production' }
        }

        return { valid: true, value: '***masked***' }
      },
      remediation: 'Use secure database connection with SSL/TLS in production',
    })

    // CORS Security Rules
    this.addRule({
      name: 'cors_origin_security',
      category: 'high',
      description: 'CORS origin should be properly restricted',
      check: async () => {
        const corsOrigin = process.env.CORS_ORIGIN

        if (!corsOrigin) {
          return { valid: false, message: 'CORS_ORIGIN not set' }
        }

        if (corsOrigin === '*' && config.isProduction) {
          return { valid: false, message: 'CORS allows all origins in production' }
        }

        if (corsOrigin.includes('http://') && config.isProduction) {
          return { valid: false, message: 'CORS allows HTTP origins in production' }
        }

        return { valid: true, value: corsOrigin }
      },
      remediation: 'Restrict CORS to specific HTTPS origins in production',
    })

    // SSL/TLS Rules
    this.addRule({
      name: 'ssl_enforcement',
      category: 'critical',
      description: 'SSL should be enforced in production',
      check: async () => {
        if (!config.isProduction) {
          return { valid: true, message: 'SSL not required in development' }
        }

        const sslEnabled = process.env.SSL_ENABLED === 'true'
        if (!sslEnabled) {
          return { valid: false, message: 'SSL not enabled in production' }
        }

        return { valid: true, value: sslEnabled }
      },
      remediation: 'Enable SSL/TLS in production by setting SSL_ENABLED=true',
    })

    // Session Security Rules
    this.addRule({
      name: 'session_secret_strength',
      category: 'critical',
      description: 'Session secret must be strong',
      check: async () => {
        const sessionSecret = process.env.SESSION_SECRET

        if (!sessionSecret) {
          return { valid: false, message: 'SESSION_SECRET not set' }
        }

        if (sessionSecret.length < 32) {
          return {
            valid: false,
            message: `Session secret too short (${sessionSecret.length} < 32)`,
          }
        }

        if (sessionSecret.includes('default') || sessionSecret.includes('change')) {
          return { valid: false, message: 'Using default session secret' }
        }

        return { valid: true, value: '***masked***' }
      },
      remediation: 'Generate a cryptographically secure session secret',
    })

    // Rate Limiting Rules
    this.addRule({
      name: 'rate_limiting_configuration',
      category: 'medium',
      description: 'Rate limiting should be properly configured',
      check: async () => {
        const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10)
        const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)

        if (maxRequests > 1000) {
          return {
            valid: false,
            message: `Rate limit too high (${maxRequests} > 1000)`,
            value: { windowMs, maxRequests },
          }
        }

        if (windowMs < 60000) {
          // Less than 1 minute
          return {
            valid: false,
            message: `Rate limit window too short (${windowMs}ms < 60s)`,
            value: { windowMs, maxRequests },
          }
        }

        return { valid: true, value: { windowMs, maxRequests } }
      },
      remediation:
        'Configure appropriate rate limiting (max 1000 requests per window, min 1 minute window)',
    })

    // Logging Security Rules
    this.addRule({
      name: 'security_logging_enabled',
      category: 'high',
      description: 'Security logging should be enabled',
      check: async () => {
        const loggingEnabled = process.env.SECURITY_LOGGING_ENABLED !== 'false'
        const logLevel = process.env.SECURITY_MIN_SEVERITY || 'INFO'

        if (!loggingEnabled) {
          return { valid: false, message: 'Security logging is disabled' }
        }

        const validLevels = ['INFO', 'WARNING', 'HIGH', 'CRITICAL']
        if (!validLevels.includes(logLevel)) {
          return { valid: false, message: `Invalid log level: ${logLevel}` }
        }

        return { valid: true, value: { enabled: loggingEnabled, level: logLevel } }
      },
      remediation: 'Enable security logging with appropriate log level',
    })

    // Development Features Rules
    this.addRule({
      name: 'development_features_disabled',
      category: 'critical',
      description: 'Development features should be disabled in production',
      check: async () => {
        if (!config.isProduction) {
          return { valid: true, message: 'Development environment - features allowed' }
        }

        const devEndpoints = process.env.ENABLE_DEV_ENDPOINTS === 'true'
        const debugMode = process.env.DEBUG === 'true'
        const verboseLogging = process.env.VERBOSE_LOGGING === 'true'

        const issues: string[] = []

        if (devEndpoints) issues.push('Development endpoints enabled')
        if (debugMode) issues.push('Debug mode enabled')
        if (verboseLogging) issues.push('Verbose logging enabled')

        if (issues.length > 0) {
          return {
            valid: false,
            message: issues.join(', '),
            value: { devEndpoints, debugMode, verboseLogging },
          }
        }

        return { valid: true, value: { devEndpoints, debugMode, verboseLogging } }
      },
      remediation: 'Disable all development features in production environment',
    })

    // API Security Rules
    this.addRule({
      name: 'api_versioning',
      category: 'medium',
      description: 'API should have proper versioning',
      check: async () => {
        const apiVersion = process.env.API_VERSION

        if (!apiVersion) {
          return { valid: false, message: 'API_VERSION not set' }
        }

        // Check version format (semantic versioning)
        const versionRegex = /^v?\d+(\.\d+)?(\.\d+)?$/
        if (!versionRegex.test(apiVersion)) {
          return { valid: false, message: `Invalid API version format: ${apiVersion}` }
        }

        return { valid: true, value: apiVersion }
      },
      remediation: 'Set proper API version in semantic versioning format (e.g., v1.0.0)',
    })

    // Error Handling Rules
    this.addRule({
      name: 'error_disclosure',
      category: 'medium',
      description: 'Error messages should not expose sensitive information',
      check: async () => {
        const nodeEnv = process.env.NODE_ENV
        const showStack = process.env.SHOW_STACK_TRACE === 'true'

        if (config.isProduction && showStack) {
          return { valid: false, message: 'Stack traces enabled in production' }
        }

        return { valid: true, value: { nodeEnv, showStack } }
      },
      remediation: 'Disable stack traces and detailed error messages in production',
    })
  }

  private addRule(rule: SecurityRule): void {
    this.rules.push(rule)
  }

  async validateAll(): Promise<{
    passed: number
    failed: number
    total: number
    score: number
    results: Array<{
      name: string
      category: string
      description: string
      valid: boolean
      message?: string
      value?: any
      remediation: string
    }>
  }> {
    const results: any[] = []
    let passed = 0
    let failed = 0

    for (const rule of this.rules) {
      try {
        const result = await rule.check()

        const ruleResult = {
          name: rule.name,
          category: rule.category,
          description: rule.description,
          valid: result.valid,
          message: result.message,
          value: result.value,
          remediation: rule.remediation,
        }

        results.push(ruleResult)
        this.validationResults.set(rule.name, ruleResult)

        if (result.valid) {
          passed++
        } else {
          failed++

          // Log security configuration issues
          const severity = this.getCategorySeverity(rule.category)
          securityLogger.log({
            eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity,
            message: `Security configuration issue: ${rule.name}`,
            metadata: {
              rule: rule.name,
              category: rule.category,
              description: rule.description,
              message: result.message,
              remediation: rule.remediation,
            },
          })
        }
      } catch (error) {
        const ruleResult = {
          name: rule.name,
          category: rule.category,
          description: rule.description,
          valid: false,
          message: `Validation error: ${error.message}`,
          remediation: rule.remediation,
        }

        results.push(ruleResult)
        failed++

        securityLogger.log({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.HIGH,
          message: `Security validation error for rule: ${rule.name}`,
          metadata: { rule: rule.name, error: error.message },
        })
      }
    }

    const total = passed + failed
    const score = total === 0 ? 0 : Math.round((passed / total) * 100)

    // Log overall security score
    const scoreSeverity =
      score < 70
        ? SecuritySeverity.CRITICAL
        : score < 85
          ? SecuritySeverity.HIGH
          : score < 95
            ? SecuritySeverity.WARNING
            : SecuritySeverity.INFO

    securityLogger.log({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: scoreSeverity,
      message: `Security configuration validation completed`,
      metadata: {
        score,
        passed,
        failed,
        total,
        environment: process.env.NODE_ENV,
      },
    })

    return { passed, failed, total, score, results }
  }

  private getCategorySeverity(category: string): SecuritySeverity {
    switch (category) {
      case 'critical':
        return SecuritySeverity.CRITICAL
      case 'high':
        return SecuritySeverity.HIGH
      case 'medium':
        return SecuritySeverity.WARNING
      case 'low':
        return SecuritySeverity.INFO
      default:
        return SecuritySeverity.WARNING
    }
  }

  async validateCategory(category: SecurityCategory): Promise<any[]> {
    const categoryResults: any[] = []

    for (const rule of this.rules) {
      // Simple category matching - in production, you'd have better categorization
      if (
        rule.name.includes(category.toLowerCase()) ||
        rule.description.toLowerCase().includes(category.toLowerCase())
      ) {
        try {
          const result = await rule.check()
          categoryResults.push({
            name: rule.name,
            category: rule.category,
            description: rule.description,
            valid: result.valid,
            message: result.message,
            value: result.value,
            remediation: rule.remediation,
          })
        } catch (error) {
          categoryResults.push({
            name: rule.name,
            category: rule.category,
            description: rule.description,
            valid: false,
            message: `Validation error: ${error.message}`,
            remediation: rule.remediation,
          })
        }
      }
    }

    return categoryResults
  }

  getValidationResult(ruleName: string): any {
    return this.validationResults.get(ruleName)
  }

  getRules(): Array<{ name: string; category: string; description: string }> {
    return this.rules.map(rule => ({
      name: rule.name,
      category: rule.category,
      description: rule.description,
    }))
  }

  async generateSecurityReport(): Promise<{
    summary: any
    recommendations: string[]
    criticalIssues: any[]
    complianceScore: number
  }> {
    const validation = await this.validateAll()

    const criticalIssues = validation.results.filter(
      r => !r.valid && (r.category === 'critical' || r.category === 'high')
    )

    const recommendations: string[] = []

    // Generate recommendations based on failed rules
    for (const result of validation.results) {
      if (!result.valid) {
        recommendations.push(`${result.name}: ${result.remediation}`)
      }
    }

    return {
      summary: {
        score: validation.score,
        passed: validation.passed,
        failed: validation.failed,
        total: validation.total,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
      recommendations,
      criticalIssues,
      complianceScore: validation.score,
    }
  }
}

// Export singleton instance
export const securityConfigValidator = new SecurityConfigValidator()

export default SecurityConfigValidator
