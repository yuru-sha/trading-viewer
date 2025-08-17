import { Router } from 'express'
import authRoutes from './authRoutes'
import userManagementRoutes from './userManagementRoutes'
import securityRoutes from './securityRoutes'
import fileUploadRoutes from './fileUploadRoutes'

const router = Router()

// Mount all auth-related routes
router.use('/', authRoutes)
router.use('/', userManagementRoutes)
router.use('/', securityRoutes)
router.use('/', fileUploadRoutes)

export default router
