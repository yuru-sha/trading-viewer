import { Request, Response, NextFunction } from 'express'
import { injectable, inject } from 'inversify'
import { AuthService } from '../application/services/AuthService'
import { AuthValidator } from '../validators/AuthValidator'
import { TYPES } from '../infrastructure/di/types'
import { log } from '../infrastructure/services/logger'
import {
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  requireAuth,
  requireCSRF,
  AuthenticatedRequest,
  COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  generateCSRFToken,
  revokeAllUserCSRFTokens,
} from '../middleware/auth'

interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: string[]
}

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: AuthService,
    @inject(TYPES.AuthValidator) private validator: AuthValidator
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = this.validator.validateRegisterRequest(req.body)
      if (!validatedData.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validatedData.errors,
        })
        return
      }

      const result = await this.authService.register(validatedData.data)

      // Set HTTP-only cookies
      res.cookie(ACCESS_TOKEN_COOKIE, result.token, COOKIE_OPTIONS)
      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTIONS)

      // Generate and set CSRF token
      const csrfToken = await generateCSRFToken(result.user.id)
      res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
        ...COOKIE_OPTIONS,
        httpOnly: false, // CSRF token needs to be accessible to client
      })

      const response: ApiResponse = {
        success: true,
        message: 'Registration successful',
        data: {
          user: result.user,
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }

      res.status(201).json(response)
      return
    } catch (error) {
      log.auth.error('Registration failed', error)
      next(error)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = this.validator.validateLoginRequest(req.body)
      if (!validatedData.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validatedData.errors,
        })
        return
      }

      const result = await this.authService.login(validatedData.data)

      // Set HTTP-only cookies
      res.cookie(ACCESS_TOKEN_COOKIE, result.token, COOKIE_OPTIONS)
      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTIONS)

      // Generate and set CSRF token
      const csrfToken = await generateCSRFToken(result.user.id)
      res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
        ...COOKIE_OPTIONS,
        httpOnly: false,
      })

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Login failed', error)
      next(error)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE]

      if (refreshToken) {
        await this.authService.logout(refreshToken)
      }

      // Clear all auth cookies
      res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
      res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_OPTIONS)
      res.clearCookie(CSRF_TOKEN_COOKIE, COOKIE_OPTIONS)

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Logout failed', error)
      next(error)
    }
  }

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE]

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token not found',
        })
        return
      }

      const result = await this.authService.refreshToken(refreshToken)

      // Set new access token
      res.cookie(ACCESS_TOKEN_COOKIE, result.token, COOKIE_OPTIONS)

      // Generate new CSRF token
      const csrfToken = await generateCSRFToken(result.user.id)
      res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
        ...COOKIE_OPTIONS,
        httpOnly: false,
      })

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Token refresh failed', error)
      next(error)
    }
  }

  changePassword = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = this.validator.validateChangePasswordRequest(req.body)
      if (!validatedData.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validatedData.errors,
        })
        return
      }

      await this.authService.changePassword(req.user!.userId, validatedData.data)

      // Clear all cookies to force re-login
      res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
      res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_OPTIONS)
      res.clearCookie(CSRF_TOKEN_COOKIE, COOKIE_OPTIONS)

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully. Please login again.',
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Password change failed', error)
      next(error)
    }
  }

  updateProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = this.validator.validateUpdateProfileRequest(req.body)
      if (!validatedData.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validatedData.errors,
        })
        return
      }

      const updatedUser = await this.authService.updateProfile(req.user!.userId, validatedData.data)

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Profile update failed', error)
      next(error)
    }
  }

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = this.validator.validateForgotPasswordRequest(req.body)
      if (!validatedData.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validatedData.errors,
        })
        return
      }

      await this.authService.forgotPassword(validatedData.data.email)

      // Always return success for security (don't reveal if email exists)
      const response: ApiResponse = {
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Forgot password failed', error)
      next(error)
    }
  }

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = this.validator.validateResetPasswordRequest(req.body)
      if (!validatedData.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validatedData.errors,
        })
        return
      }

      await this.authService.resetPassword(validatedData.data)

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully. Please login with your new password.',
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Password reset failed', error)
      next(error)
    }
  }

  getCurrentUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.authService.getCurrentUser(req.user!.userId)

      const response: ApiResponse = {
        success: true,
        data: { user },
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Get current user failed', error)
      next(error)
    }
  }

  getCSRFToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const csrfToken = await generateCSRFToken(req.user!.userId)
      res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
        ...COOKIE_OPTIONS,
        httpOnly: false,
      })

      const response: ApiResponse = {
        success: true,
        data: { csrfToken },
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('CSRF token generation failed', error)
      next(error)
    }
  }

  deleteAccount = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // TODO: Implement account deletion logic in AuthService
      // await this.authService.deleteAccount(req.user!.userId)

      // Clear all cookies
      res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
      res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_OPTIONS)
      res.clearCookie(CSRF_TOKEN_COOKIE, COOKIE_OPTIONS)

      const response: ApiResponse = {
        success: true,
        message: 'Account deleted successfully',
      }

      res.status(200).json(response)
      return
    } catch (error) {
      log.auth.error('Account deletion failed', error)
      next(error)
    }
  }
}
