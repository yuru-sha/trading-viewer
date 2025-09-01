import { lazy } from 'react'

// 基本ページは eager loading（初期表示で必要）
export { default as HomePage } from './HomePage'

// チャートページは専用の最適化済み遅延読み込み
export const ChartsPage = lazy(() => import('./ChartsPage'))

// 一般的なページは lazy loading
export const MarketPage = lazy(() => import('./MarketPage'))
export const SearchPage = lazy(() => import('./SearchPage'))
export const WatchlistPage = lazy(() => import('./WatchlistPage'))
export const AlertsPage = lazy(() => import('./AlertsPage'))
export const SettingsPage = lazy(() => import('./SettingsPage'))
export const HelpPage = lazy(() => import('./HelpPage'))

// 管理画面は専用チャンクで遅延読み込み（使用頻度が低いため）
export const AdminUsersPage = lazy(() => import('./AdminUsersPage'))
