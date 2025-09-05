import { z } from 'zod'
import { injectable } from 'inversify'

@injectable()
export class AuthValidator {
  private loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })

  private registerSchema = z.object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(50, 'Name must be at most 50 characters')
      .optional(),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    role: z.enum(['USER', 'ADMIN']).optional().default('USER'),
  })

  private changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
  })

  private updateProfileSchema = z.object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(50, 'Name must be at most 50 characters')
      .optional(),
    email: z.string().email('Invalid email address').optional(),
    avatar: z.string().url('Avatar must be a valid URL').optional(),
  })

  private refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  })

  private forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
  })

  private resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
  })

  validateLoginRequest(data: unknown): ValidationResult<LoginData> {
    try {
      const validated = this.loginSchema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  validateRegisterRequest(data: unknown): ValidationResult<RegisterData> {
    try {
      const validated = this.registerSchema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  validateChangePasswordRequest(data: unknown): ValidationResult<ChangePasswordData> {
    try {
      const validated = this.changePasswordSchema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  validateUpdateProfileRequest(data: unknown): ValidationResult<UpdateProfileData> {
    try {
      const validated = this.updateProfileSchema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  validateRefreshTokenRequest(data: unknown): ValidationResult<RefreshTokenData> {
    try {
      const validated = this.refreshTokenSchema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  validateForgotPasswordRequest(
    data: unknown
  ): ValidationResult<z.infer<typeof this.forgotPasswordSchema>> {
    try {
      const validated = this.forgotPasswordSchema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  validateResetPasswordRequest(data: unknown): ValidationResult<ResetPasswordData> {
    try {
      const validated = this.resetPasswordSchema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  validateEmail(email: string): boolean {
    try {
      z.string().email().parse(email)
      return true
    } catch {
      return false
    }
  }

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password should contain at least one special character for better security')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  validateUsername(username: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (username.length < 3) {
      errors.push('Username must be at least 3 characters')
    }

    if (username.length > 50) {
      errors.push('Username must be at most 50 characters')
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// Type definitions for validation results
type LoginData = { email?: string; password?: string }
type RegisterData = { email?: string; password?: string; name?: string; role?: string }
type UpdateProfileData = { name?: string; email?: string }
type RefreshTokenData = { refreshToken?: string }
type ResetPasswordData = { token?: string; password?: string }
type ChangePasswordData = { currentPassword?: string; newPassword?: string }

type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: string[]
}
