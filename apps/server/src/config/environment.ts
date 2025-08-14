import dotenv from 'dotenv'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../services/securityLogger'

// Load environment variables
dotenv.config()

// Environment types
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

// Required environment variables for production
const REQUIRED_ENV_VARS = {
  production: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'FINNHUB_API_KEY',
    'CORS_ORIGIN',
    'SESSION_SECRET',
  ],
  staging: ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL', 'FINNHUB_API_KEY'],
  development: [],
  test: [],
}

// Sensitive environment variables that should never be logged
export const SENSITIVE_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'FINNHUB_API_KEY',
  'SESSION_SECRET',
  'SECURITY_ALERT_WEBHOOK',
  'API_KEY',
  'PASSWORD',
  'TOKEN',
  'SECRET',
]

// Environment configuration class
export class EnvironmentConfig {
  private static instance: EnvironmentConfig
  public readonly env: Environment
  public readonly isProduction: boolean
  public readonly isStaging: boolean
  public readonly isDevelopment: boolean
  public readonly isTest: boolean
  private validationErrors: string[] = []

  private constructor() {
    this.env = this.determineEnvironment()
    this.isProduction = this.env === Environment.PRODUCTION
    this.isStaging = this.env === Environment.STAGING
    this.isDevelopment = this.env === Environment.DEVELOPMENT
    this.isTest = this.env === Environment.TEST

    // Validate environment on initialization
    this.validateEnvironment()
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig()
    }
    return EnvironmentConfig.instance
  }

  private determineEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase()

    switch (nodeEnv) {
      case 'production':
      case 'prod':
        return Environment.PRODUCTION
      case 'staging':
      case 'stage':
        return Environment.STAGING
      case 'test':
      case 'testing':
        return Environment.TEST
      case 'development':
      case 'dev':
      default:
        return Environment.DEVELOPMENT
    }
  }

  private validateEnvironment(): void {
    const requiredVars = REQUIRED_ENV_VARS[this.env] || []
    const missingVars: string[] = []
    const invalidVars: string[] = []

    // Check required variables
    for (const varName of requiredVars) {
      const value = process.env[varName]

      if (!value) {
        missingVars.push(varName)
      } else if (value.includes('default') || value.includes('change-in-production')) {
        invalidVars.push(varName)
      }
    }

    // Production-specific validations
    if (this.isProduction) {
      // JWT secrets should be strong
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        invalidVars.push('JWT_SECRET (too short, minimum 32 characters)')
      }

      // Database URL should not be localhost
      if (process.env.DATABASE_URL?.includes('localhost')) {
        invalidVars.push('DATABASE_URL (localhost not allowed in production)')
      }

      // CORS origin should be specified
      if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
        invalidVars.push('CORS_ORIGIN (wildcard not allowed in production)')
      }

      // SSL should be enabled
      if (process.env.SSL_ENABLED !== 'true') {
        this.validationErrors.push('SSL_ENABLED should be true in production')
      }
    }

    // Log validation results
    if (missingVars.length > 0) {
      const message = `Missing required environment variables: ${missingVars.join(', ')}`
      this.validationErrors.push(message)

      if (this.isProduction) {
        securityLogger.log({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.CRITICAL,
          message: 'Production server started with missing environment variables',
          metadata: { missingVars },
        })
        throw new Error(message)
      } else {
        console.warn(`⚠️  Warning: ${message}`)
      }
    }

    if (invalidVars.length > 0) {
      const message = `Invalid environment variables: ${invalidVars.join(', ')}`
      this.validationErrors.push(message)

      if (this.isProduction) {
        securityLogger.log({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.CRITICAL,
          message: 'Production server started with invalid environment variables',
          metadata: { invalidVars },
        })
        throw new Error(message)
      } else {
        console.warn(`⚠️  Warning: ${message}`)
      }
    }
  }

  public get<T = string>(key: string, defaultValue?: T): T {
    const value = process.env[key]

    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue
      }

      if (this.isProduction) {
        throw new Error(`Environment variable ${key} is not defined`)
      }

      return '' as T
    }

    // Type conversion
    if (typeof defaultValue === 'number') {
      return (parseInt(value, 10) || defaultValue) as T
    }

    if (typeof defaultValue === 'boolean') {
      return (value === 'true') as T
    }

    return value as T
  }

  public getRequired(key: string): string {
    const value = process.env[key]

    if (!value) {
      const message = `Required environment variable ${key} is not defined`

      if (this.isProduction) {
        throw new Error(message)
      } else {
        console.warn(`⚠️  Warning: ${message}`)
        return ''
      }
    }

    return value
  }

  public getSafe(key: string, defaultValue: string = ''): string {
    try {
      return this.get(key, defaultValue)
    } catch {
      return defaultValue
    }
  }

  public getPort(): number {
    return this.get('PORT', 8000)
  }

  public getDatabaseUrl(): string {
    if (this.isTest) {
      return this.get('TEST_DATABASE_URL', ':memory:')
    }
    return this.getRequired('DATABASE_URL')
  }

  public getCorsOrigin(): string | string[] {
    const origin = this.get('CORS_ORIGIN', 'http://localhost:3000')

    // Support multiple origins separated by comma
    if (origin.includes(',')) {
      return origin.split(',').map(o => o.trim())
    }

    return origin
  }

  public getJwtSecrets(): { access: string; refresh: string } {
    return {
      access: this.getRequired('JWT_SECRET'),
      refresh: this.getRequired('JWT_REFRESH_SECRET'),
    }
  }

  public getRateLimitConfig(): { windowMs: number; maxRequests: number } {
    return {
      windowMs: this.get('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
      maxRequests: this.get('RATE_LIMIT_MAX_REQUESTS', 100),
    }
  }

  public getSecurityConfig(): {
    bcryptRounds: number
    sessionSecret: string
    cookieSecure: boolean
    trustProxy: boolean
  } {
    return {
      bcryptRounds: this.get('BCRYPT_SALT_ROUNDS', 12),
      sessionSecret: this.getRequired('SESSION_SECRET'),
      cookieSecure: this.isProduction,
      trustProxy: this.get('TRUST_PROXY', false),
    }
  }

  public isFeatureEnabled(feature: string): boolean {
    const key = `FEATURE_${feature.toUpperCase()}_ENABLED`
    return this.get(key, false)
  }

  public getValidationErrors(): string[] {
    return [...this.validationErrors]
  }

  public isValid(): boolean {
    return this.validationErrors.length === 0
  }

  public printConfiguration(): void {
    console.log('\n🔧 Environment Configuration')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Environment: ${this.env}`)
    console.log(`Node Version: ${process.version}`)
    console.log(`Platform: ${process.platform}`)
    console.log(`Architecture: ${process.arch}`)
    console.log(`PID: ${process.pid}`)
    console.log('')

    // Print non-sensitive configuration
    const safeConfig: Record<string, any> = {
      PORT: this.getPort(),
      CORS_ORIGIN: this.getCorsOrigin(),
      RATE_LIMIT_WINDOW_MS: this.getRateLimitConfig().windowMs,
      RATE_LIMIT_MAX_REQUESTS: this.getRateLimitConfig().maxRequests,
      SSL_ENABLED: this.get('SSL_ENABLED', false),
      FEATURES: {
        AUTH_ENABLED: this.isFeatureEnabled('AUTH'),
        WEBSOCKET_ENABLED: this.isFeatureEnabled('WEBSOCKET'),
        CACHE_ENABLED: this.isFeatureEnabled('CACHE'),
      },
    }

    for (const [key, value] of Object.entries(safeConfig)) {
      if (typeof value === 'object') {
        console.log(`${key}:`)
        for (const [subKey, subValue] of Object.entries(value)) {
          console.log(`  ${subKey}: ${subValue}`)
        }
      } else {
        console.log(`${key}: ${value}`)
      }
    }

    if (this.validationErrors.length > 0) {
      console.log('\n⚠️  Validation Warnings:')
      this.validationErrors.forEach(error => {
        console.log(`  - ${error}`)
      })
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
}

// Export singleton instance
export const config = EnvironmentConfig.getInstance()

// Export helper functions
export const isDevelopment = () => config.isDevelopment
export const isProduction = () => config.isProduction
export const isStaging = () => config.isStaging
export const isTest = () => config.isTest
