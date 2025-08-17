import { Router } from 'express'
import authRoutes from './authRoutes'
// 他の分割されたルートファイルは段階的に実装
// import userManagementRoutes from './userManagementRoutes'
// import securityRoutes from './securityRoutes'
// import fileUploadRoutes from './fileUploadRoutes'

/**
 * 認証関連ルート統合ファイル
 *
 * auth.ts から機能別に分割されたルートを統合
 * パフォーマンス改善とメンテナビリティ向上のため
 */

const router = Router()

// 基本認証ルート
router.use('/', authRoutes)

// TODO: 段階的に他のルートを統合
// router.use('/users', userManagementRoutes)
// router.use('/security', securityRoutes)
// router.use('/upload', fileUploadRoutes)

export default router
