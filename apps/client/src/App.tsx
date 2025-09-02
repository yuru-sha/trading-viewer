import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@trading-viewer/ui'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorProvider } from './contexts/ErrorContext'
import { useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { PageLoader, ChartLoader, AdminLoader } from './components/LoadingSpinner'
import { initializeMemoryManager } from './utils/memoryManager'
// Critical pages loaded immediately
import { HomePage } from './pages'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

// Lazy load heavy components for better performance
const MarketPage = React.lazy(() => import('./pages/MarketPage'))
const ChartsPage = React.lazy(() => import('./pages/ChartsPage'))
const SearchPage = React.lazy(() => import('./pages/SearchPage'))
const WatchlistPage = React.lazy(() => import('./pages/WatchlistPage'))
const AlertsPage = React.lazy(() => import('./pages/AlertsPage'))
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage'))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'))
const HelpPage = React.lazy(() => import('./pages/HelpPage'))

const AppContent: React.FC = () => {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const isChartsPage = location.pathname === '/charts'
  const isLoginPage = location.pathname === '/login'
  const isResetPasswordPage = location.pathname === '/reset-password'

  // 認証状態をロード中の場合は待機
  if (isLoading) {
    return null // 一瞬の表示を防ぐため何も表示しない
  }

  // 認証済みかつログインページにいる場合はホームにリダイレクト
  if (isAuthenticated && (isLoginPage || isResetPasswordPage)) {
    return <Navigate to='/' replace />
  }

  // 未認証の場合はログインページまたはパスワードリセットページを表示
  if (!isAuthenticated) {
    if (isLoginPage || isResetPasswordPage) {
      return (
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/reset-password' element={<ResetPasswordPage />} />
        </Routes>
      )
    }
    return <Navigate to='/login' replace />
  }

  if (isChartsPage) {
    // Charts page - full screen without layout with lazy loading
    return (
      <Suspense
        fallback={<div className='flex items-center justify-center h-screen'>Loading Chart...</div>}
      >
        <Routes>
          <Route path='/charts' element={<ChartsPage />} />
        </Routes>
      </Suspense>
    )
  }

  // Other pages with layout and lazy loading
  return (
    <Layout>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route
          path='/market'
          element={
            <Suspense fallback={<PageLoader />}>
              <MarketPage />
            </Suspense>
          }
        />
        <Route
          path='/charts'
          element={
            <Suspense fallback={<ChartLoader />}>
              <ChartsPage />
            </Suspense>
          }
        />
        <Route
          path='/search'
          element={
            <Suspense fallback={<PageLoader />}>
              <SearchPage />
            </Suspense>
          }
        />
        <Route
          path='/watchlist'
          element={
            <Suspense fallback={<PageLoader />}>
              <WatchlistPage />
            </Suspense>
          }
        />
        <Route
          path='/alerts'
          element={
            <Suspense fallback={<PageLoader />}>
              <AlertsPage />
            </Suspense>
          }
        />
        <Route
          path='/settings'
          element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path='/help'
          element={
            <Suspense fallback={<PageLoader />}>
              <HelpPage />
            </Suspense>
          }
        />
        <Route
          path='/admin/users'
          element={
            <Suspense fallback={<AdminLoader />}>
              <AdminUsersPage />
            </Suspense>
          }
        />
      </Routes>
    </Layout>
  )
}

const App: React.FC = () => {
  useEffect(() => {
    // アプリ起動時にメモリマネージャーを初期化
    initializeMemoryManager()
  }, [])

  return (
    <ErrorBoundary>
      <ErrorProvider>
        <AuthProvider>
          <AppProvider>
            <Router>
              <AppContent />
            </Router>
          </AppProvider>
        </AuthProvider>
      </ErrorProvider>
    </ErrorBoundary>
  )
}

export default App
