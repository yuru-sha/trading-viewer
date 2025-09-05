import { Router, type IRouter } from 'express'
import { AuthController } from '../../controllers/AuthController'
import { authMiddleware } from '../../middleware/AuthMiddleware'
import { getService } from '../../infrastructure/di/container'
import { TYPES } from '../../infrastructure/di/types'

const router: IRouter = Router()

// Get AuthController from DI container
const authController = getService<AuthController>(TYPES.AuthController)

// Public routes
router.post('/register', authController.register.bind(authController))
router.post('/login', authController.login.bind(authController))
router.post('/logout', authController.logout.bind(authController))
router.post('/refresh-token', authController.refreshToken.bind(authController))
router.post('/forgot-password', authController.forgotPassword.bind(authController))
router.post('/reset-password', authController.resetPassword.bind(authController))

// Protected routes
router.use(authMiddleware.authenticate)
router.post('/change-password', authController.changePassword.bind(authController))
router.put('/profile', authController.updateProfile.bind(authController))
router.get('/me', authController.getCurrentUser.bind(authController))

export { router as authRouter }
