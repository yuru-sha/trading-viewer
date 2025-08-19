import React, { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp, useAppActions } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useFocusManagement, SkipLinks } from '../hooks/useFocusManagement'
import Onboarding from './Onboarding'
import { useOnboarding, createTradingViewerOnboarding } from '../hooks/useOnboarding'
import { MobileBottomNav } from './layout/MobileBottomNav'
import { Header } from './layout/Header'
import { LoadingOverlay } from './layout/LoadingOverlay'
import { LayoutErrorDisplay } from './layout/LayoutErrorDisplay'

interface LayoutProps {
  children: ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { state } = useApp()
  const { setTheme, clearAppError } = useAppActions()
  const { user } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // オンボーディング設定
  const onboardingSteps = createTradingViewerOnboarding()
  const onboarding = useOnboarding(onboardingSteps, {
    key: 'main-tour',
    version: 1,
    autoStart: true,
    showOnFirstVisit: true,
  })

  // WCAG 2.1 準拠のフォーカス管理
  const focusManagement = useFocusManagement({
    trapFocus: false,
    restoreFocus: true,
    skipLinks: true,
  })
  const containerRef = focusManagement.containerRef as React.RefObject<HTMLDivElement>
  const announceToScreenReader = focusManagement.announceToScreenReader

  // スキップリンク定義
  const skipLinks = [
    { href: '#main-navigation', label: 'Skip to main navigation' },
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#mobile-menu', label: 'Skip to mobile menu' },
  ]

  const navigation = [
    {
      name: 'Watchlist',
      href: '/watchlist',
      current: location.pathname === '/watchlist' || location.pathname === '/',
      iconName: 'heart' as const,
    },
    {
      name: 'Market',
      href: '/market',
      current: location.pathname === '/market',
      iconName: 'trending' as const,
    },
    {
      name: 'Charts',
      href: '/charts',
      current: location.pathname === '/charts',
      iconName: 'chart' as const,
    },
    {
      name: 'Search',
      href: '/search',
      current: location.pathname === '/search',
      iconName: 'search' as const,
    },
    {
      name: 'Alerts',
      href: '/alerts',
      current: location.pathname === '/alerts',
      iconName: 'bell' as const,
    },
    ...(user?.role === 'admin'
      ? [
          {
            name: 'Users',
            href: '/admin/users',
            current: location.pathname === '/admin/users',
            iconName: 'users' as const,
          },
        ]
      : []),
  ]

  const toggleTheme = () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark')
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileNavigate = (message: string) => {
    setIsMobileMenuOpen(false)
    announceToScreenReader(message)
  }

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className='min-h-screen bg-white dark:bg-gray-900 flex flex-col' ref={containerRef}>
      {/* Skip Links */}
      <SkipLinks links={skipLinks} />

      {/* Header */}
      <Header
        navigation={navigation}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={toggleMobileMenu}
        onMobileNavigate={handleMobileNavigate}
      />

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={state.isLoading} />

      {/* Error Display */}
      <LayoutErrorDisplay />

      {/* Main Content */}
      <main id='main-content' className='flex-1 overflow-hidden' role='main'>
        <div className='h-full'>{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav navigation={navigation} />

      {/* Onboarding Tour */}
      <Onboarding
        steps={onboarding.steps}
        isActive={onboarding.isActive}
        onComplete={onboarding.complete}
        onSkip={onboarding.skip}
        onStepChange={onboarding.handleStepChange}
      />
    </div>
  )
}