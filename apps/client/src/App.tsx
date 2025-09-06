import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@trading-viewer/ui'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorProvider } from './contexts/ErrorContext'
import { useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { initializeMemoryManager } from './utils/memoryManager'
import {
  HomePage,
  MarketPage,
  ChartsPage,
  SearchPage,
  WatchlistPage,
  AlertsPage,
  AdminUsersPage,
  SettingsPage,
  HelpPage,
} from './pages'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

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
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading Chart...</div>}>
        <Routes>
          <Route path='/charts' element={<ChartsPage />} />
        </Routes>
      </Suspense>
    )
  }

  // Other pages with layout and lazy loading
  return (
    <Layout>
      <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/market' element={<MarketPage />} />
          <Route path='/search' element={<SearchPage />} />
          <Route path='/watchlist' element={<WatchlistPage />} />
          <Route path='/alerts' element={<AlertsPage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='/help' element={<HelpPage />} />
          <Route path='/admin/users' element={<AdminUsersPage />} />
        </Routes>
      </Suspense>
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
