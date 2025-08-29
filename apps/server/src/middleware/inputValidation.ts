import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { AuthenticatedRequest } from './auth'
import { ValidationError } from './errorHandling'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../infrastructure/services/securityLogger'

// Injection attack patterns
const INJECTION_PATTERNS = {
  // SQL Injection patterns
  SQL_INJECTION: [
    /('|'|;|\|\||\*|%27|%3D|sp_executesql)/i,
    /(union\s+select|insert\s+into|delete\s+from|update\s+set|drop\s+table|create\s+table)/i,
    /(\bselect\b.*\bfrom\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b)/i,
    /(exec(\s|\+)+(s|x) p\w+|execute(\s|\+)+(s|x) p\w+)/i,
    /(\bor\b\s+\d+\s*=\s*\d+|\band\b\s+\d+\s*=\s*\d+)/i,
  ],

  // NoSQL Injection patterns
  NOSQL_INJECTION: [
    /(\$ne|\$gt|\$gte|\$lt|\$lte|\$in|\$nin|\$exists|\$regex|\$where)/i,
    /(\{\s*\$ne\s*:\s*null\s*\}|\{\s*\$regex\s*:)/i,
    /(javascript:|eval\(|function\s*\()/i,
  ],

  // XSS patterns
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /on\w+\s*=\s*["']?[^"'>]*["']?/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /<(script|object|embed|link|style|img|body|meta|html)/gi,
  ],

  // LDAP Injection patterns
  LDAP_INJECTION: [
    /(\*\)|\|\||&&|\(|\)|,|;|\\|\||&)/,
    /(objectClass=\*|objectCategory=\*)/i,
    /(\(\w+=\*\)|\(!\w+=\*\))/,
  ],

  // Command Injection patterns
  COMMAND_INJECTION: [
    /(;|\||&|`|\$\(|\$\{|<|>|\|\||&&)/,
    /(cat\s+|ls\s+|pwd|whoami|id|uname|ps\s+|kill\s+|rm\s+|mv\s+|cp\s+)/i,
    /(nc\s+|netcat\s+|wget\s+|curl\s+|ssh\s+|scp\s+|ftp\s+)/i,
    /(bash|sh|cmd|powershell|python|perl|ruby|php)/i,
  ],

  // Path Traversal patterns
  PATH_TRAVERSAL: [
    /(\.\.[/\\]|\.\.%2f|\.\.%5c|%2e%2e%2f|%2e%2e%5c)/i,
    /(\/etc\/passwd|\/etc\/shadow|\.ssh|\.htaccess|web\.config)/i,
    /(\\windows\\|\\system32\\|\\boot\\)/i,
  ],

  // XXE patterns
  XXE: [
    /<!DOCTYPE\s+\w+\s+\[/i,
    /<!ENTITY\s+\w+/i,
    /SYSTEM\s+["']file:/i,
    /<\?xml.*encoding.*\?>/i,
  ],
} as const

// Input sanitization utilities
export class InputSanitizer {
  // Sanitize HTML content
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return ''

    // Use DOMPurify to remove malicious HTML
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    })
  }

  // Sanitize for SQL contexts
  static sanitizeForSQL(input: string): string {
    if (typeof input !== 'string') return ''

    // Remove or escape dangerous characters
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multiline comments
      .replace(/\*\//g, '')
  }

  // Sanitize for JavaScript contexts
  static sanitizeForJavaScript(input: string): string {
    if (typeof input !== 'string') return ''

    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/&/g, '&amp;')
  }

  // Normalize Unicode characters to prevent bypass
  static normalizeUnicode(input: string): string {
    if (typeof input !== 'string') return ''

    // Normalize to NFC form
    return input.normalize('NFC')
  }

  // Remove null bytes and control characters
  static removeControlCharacters(input: string): string {
    if (typeof input !== 'string') return ''

    // Remove null bytes and other control characters
    // eslint-disable-next-line no-control-regex
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }

  // Comprehensive input sanitization
  static sanitize(
    input: string,
    context: 'html' | 'sql' | 'javascript' | 'general' = 'general'
  ): string {
    if (typeof input !== 'string') return ''

    let sanitized = input

    // Apply basic sanitization
    sanitized = this.normalizeUnicode(sanitized)
    sanitized = this.removeControlCharacters(sanitized)

    // Apply context-specific sanitization
    switch (context) {
      case 'html':
        sanitized = this.sanitizeHtml(sanitized)
        break
      case 'sql':
        sanitized = this.sanitizeForSQL(sanitized)
        break
      case 'javascript':
        sanitized = this.sanitizeForJavaScript(sanitized)
        break
      case 'general':
      default:
        // Apply general HTML sanitization
        sanitized = this.sanitizeHtml(sanitized)
        break
    }

    return sanitized.trim()
  }
}

// Injection detection service
export class InjectionDetector {
  // Detect SQL injection attempts
  static detectSQLInjection(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = []

    for (const pattern of INJECTION_PATTERNS.SQL_INJECTION) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source)
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    }
  }

  // Detect XSS attempts
  static detectXSS(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = []

    for (const pattern of INJECTION_PATTERNS.XSS) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source)
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    }
  }

  // Detect command injection attempts
  static detectCommandInjection(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = []

    for (const pattern of INJECTION_PATTERNS.COMMAND_INJECTION) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source)
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    }
  }

  // Detect NoSQL injection attempts
  static detectNoSQLInjection(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = []

    for (const pattern of INJECTION_PATTERNS.NOSQL_INJECTION) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source)
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    }
  }

  // Comprehensive injection detection
  static detectInjection(input: string): {
    detected: boolean
    types: string[]
    patterns: string[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  } {
    const results = {
      sql: this.detectSQLInjection(input),
      xss: this.detectXSS(input),
      command: this.detectCommandInjection(input),
      nosql: this.detectNoSQLInjection(input),
    }

    const detectedTypes: string[] = []
    const allPatterns: string[] = []

    for (const [type, result] of Object.entries(results)) {
      if (result.detected) {
        detectedTypes.push(type)
        allPatterns.push(...result.patterns)
      }
    }

    // Determine risk level based on detection count and types
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (detectedTypes.length === 0) {
      riskLevel = 'low'
    } else if (detectedTypes.length === 1) {
      riskLevel = detectedTypes.includes('xss') ? 'medium' : 'high'
    } else if (detectedTypes.length >= 2) {
      riskLevel = 'critical'
    }

    return {
      detected: detectedTypes.length > 0,
      types: detectedTypes,
      patterns: allPatterns,
      riskLevel,
    }
  }
}

// Input validation middleware
export const validateAndSanitizeInput = (
  sanitizationContext: 'html' | 'sql' | 'javascript' | 'general' = 'general'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const processObject = (obj: any, path: string = ''): any => {
      if (obj === null || obj === undefined) return obj

      if (typeof obj === 'string') {
        // Detect injection attempts
        const injectionResult = InjectionDetector.detectInjection(obj)

        if (injectionResult.detected) {
          securityLogger.logRequest(
            req as AuthenticatedRequest,
            SecurityEventType.SQL_INJECTION_ATTEMPT,
            `Injection attempt detected in ${path}: ${injectionResult.types.join(', ')}`,
            injectionResult.riskLevel === 'critical'
              ? SecuritySeverity.CRITICAL
              : SecuritySeverity.HIGH,
            {
              path,
              originalValue: obj.substring(0, 200), // Log only first 200 chars
              detectedTypes: injectionResult.types,
              patterns: injectionResult.patterns,
              riskLevel: injectionResult.riskLevel,
            }
          )

          // Block critical injection attempts
          if (injectionResult.riskLevel === 'critical') {
            res.status(400).json({
              success: false,
              message: 'Input contains potentially malicious content',
              code: 'INJECTION_DETECTED',
            })
            return
          }
        }

        // Sanitize the input
        return InputSanitizer.sanitize(obj, sanitizationContext)
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) => processObject(item, `${path}[${index}]`))
      }

      if (typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          const sanitizedKey = InputSanitizer.sanitize(key, 'general')
          const newPath = path ? `${path}.${key}` : key
          result[sanitizedKey] = processObject(value, newPath)
        }
        return result
      }

      return obj
    }

    try {
      // Sanitize request body
      if (req.body) {
        req.body = processObject(req.body, 'body')
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = processObject(req.query, 'query')
      }

      // Sanitize URL parameters
      if (req.params) {
        req.params = processObject(req.params, 'params')
      }

      next()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
      securityLogger.logRequest(
        req as AuthenticatedRequest,
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        `Input validation failed: ${errorMessage}`,
        SecuritySeverity.HIGH,
        { error: errorMessage }
      )

      res.status(400).json({
        success: false,
        message: 'Invalid input format',
        code: 'VALIDATION_ERROR',
      })
    }
  }
}

// Schema-based validation with injection detection
export const validateRequest = (schemas: {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: any = {}

      // Validate body
      if (schemas.body && req.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body)
        } catch (error) {
          if (error instanceof ZodError) {
            errors.body = error.errors
          }
        }
      }

      // Validate query
      if (schemas.query && req.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query)
        } catch (error) {
          if (error instanceof ZodError) {
            errors.query = error.errors
          }
        }
      }

      // Validate params
      if (schemas.params && req.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params)
        } catch (error) {
          if (error instanceof ZodError) {
            errors.params = error.errors
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Request validation failed', errors)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Parameterized query helper for safe database operations
export class ParameterizedQuery {
  // Create safe WHERE clause
  static createWhereClause(conditions: Record<string, any>): {
    clause: string
    values: any[]
  } {
    const clauses: string[] = []
    const values: any[] = []

    for (const [field, value] of Object.entries(conditions)) {
      // Validate field name (only allow alphanumeric and underscores)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
        throw new Error(`Invalid field name: ${field}`)
      }

      clauses.push(`${field} = ?`)
      values.push(value)
    }

    return {
      clause: clauses.join(' AND '),
      values,
    }
  }

  // Create safe SELECT query
  static createSelectQuery(
    table: string,
    fields: string[] = ['*'],
    conditions?: Record<string, any>,
    orderBy?: string,
    limit?: number
  ): { query: string; values: any[] } {
    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      throw new Error(`Invalid table name: ${table}`)
    }

    // Validate field names
    const safeFields = fields.filter(
      field => field === '*' || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)
    )

    if (safeFields.length === 0) {
      throw new Error('No valid fields specified')
    }

    let query = `SELECT ${safeFields.join(', ')} FROM ${table}`
    const values: any[] = []

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = this.createWhereClause(conditions)
      query += ` WHERE ${whereClause.clause}`
      values.push(...whereClause.values)
    }

    if (orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*( (ASC|DESC))?$/.test(orderBy)) {
      query += ` ORDER BY ${orderBy}`
    }

    if (limit && Number.isInteger(limit) && limit > 0) {
      query += ` LIMIT ${limit}`
    }

    return { query, values }
  }
}

export default {
  InputSanitizer,
  InjectionDetector,
  validateAndSanitizeInput,
  validateRequest,
  ParameterizedQuery,
}
