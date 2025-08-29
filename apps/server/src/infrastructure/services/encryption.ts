import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { securityLogger, SecurityEventType, SecuritySeverity } from './securityLogger'

// Encryption algorithms and configurations
export const ENCRYPTION_CONFIG = {
  // AES-256-GCM for symmetric encryption
  SYMMETRIC_ALGORITHM: 'aes-256-gcm',
  SYMMETRIC_KEY_LENGTH: 32, // 256 bits
  IV_LENGTH: 16, // 128 bits
  TAG_LENGTH: 16, // 128 bits

  // RSA for asymmetric encryption
  ASYMMETRIC_ALGORITHM: 'rsa',
  ASYMMETRIC_KEY_SIZE: 2048,

  // Hashing
  HASH_ALGORITHM: 'sha256',
  HMAC_ALGORITHM: 'sha256',

  // Password hashing
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),

  // Key derivation
  PBKDF2_ITERATIONS: 100000,
  SCRYPT_N: 16384,
  SCRYPT_R: 8,
  SCRYPT_P: 1,
} as const

// Validation for encryption strength
export class CryptographicValidator {
  // Validate encryption key strength
  static validateKeyStrength(key: Buffer | string, minLength: number = 32): boolean {
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8')

    if (keyBuffer.length < minLength) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        message: `Weak encryption key detected: length ${keyBuffer.length} < ${minLength}`,
        metadata: { keyLength: keyBuffer.length, minLength },
      })
      return false
    }

    return true
  }

  // Validate password strength
  static validatePasswordComplexity(password: string): {
    valid: boolean
    score: number
    issues: string[]
  } {
    const issues: string[] = []
    let score = 0

    // Length check
    if (password.length >= 12) score += 2
    else if (password.length >= 8) score += 1
    else issues.push('Password too short (minimum 8 characters)')

    // Character variety
    if (/[a-z]/.test(password)) score += 1
    else issues.push('Missing lowercase letters')

    if (/[A-Z]/.test(password)) score += 1
    else issues.push('Missing uppercase letters')

    if (/\d/.test(password)) score += 1
    else issues.push('Missing numbers')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 2
    else issues.push('Missing special characters')

    // Common password patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123456|654321/, // Sequential numbers
      /qwerty|asdf|zxcv/, // Keyboard patterns
      /password|admin|user|login/i, // Common words
    ]

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        score -= 2
        issues.push('Contains common password pattern')
        break
      }
    }

    // Dictionary words (simplified check)
    const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'secret']
    const lowerPassword = password.toLowerCase()
    for (const word of commonWords) {
      if (lowerPassword.includes(word)) {
        score -= 1
        issues.push('Contains dictionary words')
        break
      }
    }

    return {
      valid: score >= 5 && issues.length === 0,
      score: Math.max(0, score),
      issues,
    }
  }
}

// Symmetric encryption service
export class SymmetricEncryption {
  private readonly algorithm = ENCRYPTION_CONFIG.SYMMETRIC_ALGORITHM

  // Generate a secure random key
  static generateKey(): Buffer {
    return crypto.randomBytes(ENCRYPTION_CONFIG.SYMMETRIC_KEY_LENGTH)
  }

  // Generate initialization vector
  static generateIV(): Buffer {
    return crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH)
  }

  // Encrypt data with AES-256-GCM
  encrypt(
    data: string | Buffer,
    key: Buffer
  ): {
    encrypted: Buffer
    iv: Buffer
    tag: Buffer
  } {
    if (!CryptographicValidator.validateKeyStrength(key)) {
      throw new Error('Encryption key does not meet minimum strength requirements')
    }

    const iv = SymmetricEncryption.generateIV()
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    const encrypted = Buffer.concat([cipher.update(data.toString(), 'utf8'), cipher.final()])

    const tag = cipher.getAuthTag()

    securityLogger.log({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY, // For audit trail
      severity: SecuritySeverity.INFO,
      message: 'Data encrypted successfully',
      metadata: { algorithm: this.algorithm, dataLength: data.length },
    })

    return {
      encrypted,
      iv,
      tag,
    }
  }

  // Decrypt data with AES-256-GCM
  decrypt(encryptedData: Buffer, key: Buffer, iv: Buffer, tag: Buffer): string {
    if (!CryptographicValidator.validateKeyStrength(key)) {
      throw new Error('Decryption key does not meet minimum strength requirements')
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)

      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])

      return decrypted.toString('utf8')
    } catch (error) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Decryption failed - possible tampering or wrong key',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
      throw new Error('Decryption failed')
    }
  }

  // Encrypt and encode to base64 for storage
  encryptToBase64(data: string, key: Buffer): string {
    const { encrypted, iv, tag } = this.encrypt(data, key)

    // Combine iv + tag + encrypted data
    const combined = Buffer.concat([iv, tag, encrypted])
    return combined.toString('base64')
  }

  // Decrypt from base64
  decryptFromBase64(encryptedBase64: string, key: Buffer): string {
    const combined = Buffer.from(encryptedBase64, 'base64')

    const iv = combined.subarray(0, ENCRYPTION_CONFIG.IV_LENGTH)
    const tag = combined.subarray(
      ENCRYPTION_CONFIG.IV_LENGTH,
      ENCRYPTION_CONFIG.IV_LENGTH + ENCRYPTION_CONFIG.TAG_LENGTH
    )
    const encrypted = combined.subarray(ENCRYPTION_CONFIG.IV_LENGTH + ENCRYPTION_CONFIG.TAG_LENGTH)

    return this.decrypt(encrypted, key, iv, tag)
  }
}

// Key derivation functions
export class KeyDerivation {
  // PBKDF2 key derivation
  static async deriveKeyPBKDF2(
    password: string,
    salt: Buffer,
    iterations: number = ENCRYPTION_CONFIG.PBKDF2_ITERATIONS
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        iterations,
        ENCRYPTION_CONFIG.SYMMETRIC_KEY_LENGTH,
        ENCRYPTION_CONFIG.HASH_ALGORITHM,
        (err, key) => {
          if (err) reject(err)
          else resolve(key)
        }
      )
    })
  }

  // Scrypt key derivation
  static async deriveKeyScrypt(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        ENCRYPTION_CONFIG.SYMMETRIC_KEY_LENGTH,
        {
          N: ENCRYPTION_CONFIG.SCRYPT_N,
          r: ENCRYPTION_CONFIG.SCRYPT_R,
          p: ENCRYPTION_CONFIG.SCRYPT_P,
        },
        (err, key) => {
          if (err) reject(err)
          else resolve(key)
        }
      )
    })
  }

  // Generate cryptographically secure salt
  static generateSalt(length: number = 16): Buffer {
    return crypto.randomBytes(length)
  }
}

// Enhanced password hashing
export class PasswordSecurity {
  // Hash password with bcrypt
  static async hashPassword(password: string): Promise<string> {
    const validation = CryptographicValidator.validatePasswordComplexity(password)

    if (!validation.valid) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Weak password attempted',
        metadata: {
          score: validation.score,
          issues: validation.issues,
        },
      })
      throw new Error(
        `Password does not meet security requirements: ${validation.issues.join(', ')}`
      )
    }

    const saltRounds = ENCRYPTION_CONFIG.BCRYPT_ROUNDS
    return await bcrypt.hash(password, saltRounds)
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Password verification error',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
      return false
    }
  }

  // Check if password hash needs rehashing (due to increased rounds)
  static needsRehash(hash: string, rounds?: number): boolean {
    const targetRounds = rounds || ENCRYPTION_CONFIG.BCRYPT_ROUNDS

    try {
      // Extract current rounds from hash
      const match = hash.match(/^\$2[ayb]\$(\d+)\$/)
      if (!match) return true

      const currentRounds = parseInt(match[1], 10)
      return currentRounds < targetRounds
    } catch {
      return true
    }
  }
}

// HMAC utilities for message authentication
export class MessageAuthentication {
  // Generate HMAC signature
  static generateHMAC(message: string, key: Buffer): string {
    const hmac = crypto.createHmac(ENCRYPTION_CONFIG.HMAC_ALGORITHM, key)
    hmac.update(message)
    return hmac.digest('hex')
  }

  // Verify HMAC signature with timing-safe comparison
  static verifyHMAC(message: string, signature: string, key: Buffer): boolean {
    const expectedSignature = this.generateHMAC(message, key)

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  // Sign data with timestamp for expiry
  static signWithTimestamp(
    data: string,
    key: Buffer,
    validityMinutes: number = 15
  ): {
    signature: string
    timestamp: number
    expires: number
  } {
    const timestamp = Date.now()
    const expires = timestamp + validityMinutes * 60 * 1000
    const payload = `${data}:${timestamp}:${expires}`
    const signature = this.generateHMAC(payload, key)

    return { signature, timestamp, expires }
  }

  // Verify signed data with timestamp
  static verifyWithTimestamp(
    data: string,
    signature: string,
    timestamp: number,
    expires: number,
    key: Buffer
  ): boolean {
    // Check if expired
    if (Date.now() > expires) {
      securityLogger.log({
        eventType: SecurityEventType.TOKEN_EXPIRED,
        severity: SecuritySeverity.WARNING,
        message: 'Expired signed data verification attempted',
        metadata: { expires: new Date(expires).toISOString() },
      })
      return false
    }

    const payload = `${data}:${timestamp}:${expires}`
    return this.verifyHMAC(payload, signature, key)
  }
}

// Random value generation
export class SecureRandom {
  // Generate cryptographically secure random string
  static generateRandomString(
    length: number = 32,
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    const bytes = crypto.randomBytes(length)
    let result = ''

    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length]
    }

    return result
  }

  // Generate UUID v4
  static generateUUID(): string {
    return crypto.randomUUID()
  }

  // Generate secure token for sessions/API keys
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url')
  }
}

// Export singleton instances
export const symmetricEncryption = new SymmetricEncryption()

// Export all utilities as default exports
// Note: Classes are already exported above
