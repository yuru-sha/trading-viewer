import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@trading-viewer/ui'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorProvider } from './contexts/ErrorContext'
import { Layout } from './components/Layout'
import { HomePage, DashboardPage, ChartsPage, SearchPage, WatchlistPage } from './pages'

const AppContent: React.FC = () => {
  const location = useLocation()
  const isChartsPage = location.pathname === '/charts'

  if (isChartsPage) {
    // Charts page - full screen without layout
    return (
      <Routes>
        <Route path='/charts' element={<ChartsPage />} />
      </Routes>
    )
  }

  // Other pages with layout
  return (
    <Layout>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/search' element={<SearchPage />} />
        <Route path='/watchlist' element={<WatchlistPage />} />
      </Routes>
    </Layout>
  )
}

const App: React.FC = () => {
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
