import { Router, type IRouter } from 'express'
import { AuthController } from '../controllers/AuthController'
import { requireAuth, requireCSRF } from '../middleware/auth'
import { getService } from '../infrastructure/di/container'
import { TYPES } from '../infrastructure/di/types'

const router: IRouter = Router()

// Clean Architecture 実装 - InversifyJS DI コンテナを使用
const authController = getService<AuthController>(TYPES.AuthController)

// Public routes
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.post('/refresh', authController.refreshToken)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)
router.get('/csrf-token', authController.getCSRFToken)

// Protected routes
router.get('/me', requireAuth, authController.getCurrentUser)
router.put('/profile', requireAuth, requireCSRF, authController.updateProfile)
router.post('/change-password', requireAuth, requireCSRF, authController.changePassword)
router.delete('/account', requireAuth, requireCSRF, authController.deleteAccount)

export default router
