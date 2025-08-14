import crypto from 'crypto'

/**
 * Security Configuration Validator
 * Validates environment variables for security compliance
 */
export class SecurityConfigValidator {
  private static readonly REQUIRED_SECRETS = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ]

  private static readonly PRODUCTION_REQUIREMENTS = {
    JWT_SECRET: { minLength: 32, pattern: /^[A-Za-z0-9+/=\-_]{32,}$/ },
    JWT_REFRESH_SECRET: { minLength: 32, pattern: /^[A-Za-z0-9+/=\-_]{32,}$/ },
    BCRYPT_SALT_ROUNDS: { minValue: 12, maxValue: 18 },
  }

  private static readonly WEAK_SECRETS = [
    'secret',
    'password',
    'changeme',
    'development',
    'default',
    'your_secret_here',
    'replace_me',
    'jwt_secret',
    'refresh_secret',
  ]

  /**
   * Validates all security-related environment variables
   */
  public static validate(): { 
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required secrets
    for (const secret of this.REQUIRED_SECRETS) {
      if (!process.env[secret]) {
        errors.push(`Missing required environment variable: ${secret}`)
      } else {
        const value = process.env[secret]!
        
        // Check if secret is weak
        if (this.isWeakSecret(value)) {
          if (process.env.NODE_ENV === 'production') {
            errors.push(`Weak/default secret detected for ${secret} in production`)
          } else {
            warnings.push(`Weak/default secret detected for ${secret}. Change before production.`)
          }
        }

        // Check length and pattern requirements
        const requirement = this.PRODUCTION_REQUIREMENTS[secret as keyof typeof this.PRODUCTION_REQUIREMENTS]
        if (requirement) {
          if (value.length < requirement.minLength) {
            if (process.env.NODE_ENV === 'production') {
              errors.push(`${secret} too short. Minimum ${requirement.minLength} characters required.`)
            } else {
              warnings.push(`${secret} should be at least ${requirement.minLength} characters for production.`)
            }
          }

          if (requirement.pattern && !requirement.pattern.test(value)) {
            warnings.push(`${secret} should use strong alphanumeric characters for better security.`)
          }
        }
      }
    }

    // Check JWT token expiration times
    this.validateTokenExpiration(errors, warnings)

    // Check bcrypt salt rounds
    this.validateBcryptSaltRounds(errors, warnings)

    // Check CORS configuration
    this.validateCorsConfiguration(errors, warnings)

    // Check rate limiting configuration
    this.validateRateLimiting(errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Generates secure random secrets for development
   */
  public static generateSecrets(): Record<string, string> {
    return {
      JWT_SECRET: crypto.randomBytes(64).toString('base64'),
      JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('base64'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      CSRF_SECRET: crypto.randomBytes(32).toString('hex'),
      ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    }
  }

  /**
   * Prints security configuration status
   */
  public static printStatus(): void {
    const validation = this.validate()
    
    console.log('\n🔒 Security Configuration Status:')
    
    if (validation.isValid) {
      console.log('✅ All security checks passed')
    } else {
      console.log('❌ Security validation failed')
      validation.errors.forEach(error => {
        console.log(`   ERROR: ${error}`)
      })
    }

    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Security Warnings:')
      validation.warnings.forEach(warning => {
        console.log(`   WARNING: ${warning}`)
      })
    }

    console.log(`\n🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🔐 JWT Expiration: ${process.env.JWT_EXPIRES_IN || '15m'}`)
    console.log(`🔄 Refresh Token Expiration: ${process.env.JWT_REFRESH_EXPIRES_IN || '7d'}`)
    console.log(`🧂 BCrypt Salt Rounds: ${process.env.BCRYPT_SALT_ROUNDS || 12}`)
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📝 For production deployment, ensure all secrets are changed!')
      console.log('   Use: openssl rand -base64 64')
      console.log('   Or call SecurityConfigValidator.generateSecrets()')
    }
  }

  private static isWeakSecret(secret: string): boolean {
    const lowerSecret = secret.toLowerCase()
    return this.WEAK_SECRETS.some(weak => lowerSecret.includes(weak))
  }

  private static validateTokenExpiration(errors: string[], warnings: string[]): void {
    const jwtExpiration = process.env.JWT_EXPIRES_IN
    const refreshExpiration = process.env.JWT_REFRESH_EXPIRES_IN

    // JWT access token should be short-lived
    if (jwtExpiration && !jwtExpiration.includes('m') && !jwtExpiration.includes('h')) {
      if (process.env.NODE_ENV === 'production') {
        warnings.push('JWT access tokens should expire within hours for better security')
      }
    }

    // Refresh token should be longer-lived but not too long
    if (refreshExpiration && refreshExpiration.includes('y')) {
      warnings.push('Refresh tokens should not last longer than a year')
    }
  }

  private static validateBcryptSaltRounds(errors: string[], warnings: string[]): void {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
    
    if (saltRounds < 10) {
      if (process.env.NODE_ENV === 'production') {
        errors.push('BCrypt salt rounds too low for production (minimum 12 recommended)')
      } else {
        warnings.push('BCrypt salt rounds should be at least 12 for production')
      }
    }

    if (saltRounds > 18) {
      warnings.push('BCrypt salt rounds very high - may impact performance')
    }
  }

  private static validateCorsConfiguration(errors: string[], warnings: string[]): void {
    const corsOrigin = process.env.CORS_ORIGIN

    if (process.env.NODE_ENV === 'production') {
      if (!corsOrigin || corsOrigin === '*') {
        errors.push('CORS_ORIGIN must be set to specific domain(s) in production')
      } else if (corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1')) {
        errors.push('CORS_ORIGIN should not include localhost in production')
      }
    }
  }

  private static validateRateLimiting(errors: string[], warnings: string[]): void {
    const enableRateLimit = process.env.ENABLE_RATE_LIMITING
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')

    if (process.env.NODE_ENV === 'production') {
      if (enableRateLimit !== 'true') {
        warnings.push('Rate limiting should be enabled in production')
      }

      if (maxRequests > 1000) {
        warnings.push('Rate limit may be too high for production environment')
      }
    }
  }
}

/**
 * Initialize security validation on module load
 */
if (process.env.NODE_ENV !== 'test') {
  // Validate configuration when server starts
  const validation = SecurityConfigValidator.validate()
  
  if (!validation.isValid && process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL: Security validation failed in production!')
    validation.errors.forEach(error => console.error(`   ${error}`))
    process.exit(1)
  }
}

export default SecurityConfigValidator