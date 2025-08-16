import React, { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp, useAppActions } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useFocusManagement, SkipLinks } from '../hooks/useFocusManagement'
import ErrorDisplay from './ErrorDisplay'
import SkeletonLoader from './SkeletonLoader'
import Onboarding from './Onboarding'
import { useOnboarding, createTradingViewerOnboarding } from '../hooks/useOnboarding'
import Icon from './Icon'
import UserDropdown from './UserDropdown'
import AlertNotifications from './alerts/AlertNotifications'

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

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className='min-h-screen bg-white dark:bg-gray-900 flex flex-col' ref={containerRef}>
      {/* Skip Links */}
      <SkipLinks links={skipLinks} />

      {/* Header */}
      <header className='bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-14 md:h-16'>
            {/* Logo and Desktop Navigation */}
            <div className='flex items-center flex-1'>
              <div className='flex-shrink-0 flex items-center'>
                <Link
                  to='/'
                  className='text-lg md:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center'
                  aria-label='TradingViewer Home'
                >
                  <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3'>
                    <svg className='w-5 h-5 text-white' fill='currentColor' viewBox='0 0 24 24'>
                      <path d='M3 13h2l3-10h4l3 10h2l3-10h4v2h-2.5L18 13.5 15.5 5H12L9 15H6.5L4 5H2v2h1z' />
                    </svg>
                  </div>
                  <span className='sm:hidden'>TV</span>
                  <span className='hidden sm:inline'>TradingViewer</span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <nav
                id='main-navigation'
                className='hidden lg:ml-8 lg:flex lg:space-x-1'
                role='navigation'
                aria-label='Main navigation'
              >
                {navigation.map(item =>
                  item.name === 'Charts' ? (
                    <button
                      key={item.name}
                      onClick={() => window.open(item.href, '_blank')}
                      className={`${
                        item.current
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      } group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200`}
                      aria-current={item.current ? 'page' : undefined}
                    >
                      <Icon name={item.iconName} className='w-5 h-5 mr-2' />
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        item.current
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      } group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200`}
                      aria-current={item.current ? 'page' : undefined}
                    >
                      <Icon name={item.iconName} className='w-5 h-5 mr-2' />
                      {item.name}
                    </Link>
                  )
                )}
              </nav>
            </div>

            {/* Right side - Symbol, Theme toggle, Mobile menu */}
            <div className='flex items-center space-x-2 md:space-x-3'>
              {/* Selected Symbol Display - Responsive */}
              {state.selectedSymbol && (
                <div className='flex items-center space-x-1 md:space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg min-w-0 border border-gray-300 dark:border-gray-700'>
                  <span className='text-xs md:text-sm font-bold text-gray-900 dark:text-white truncate max-w-16 md:max-w-none'>
                    {state.selectedSymbol}
                  </span>
                  <span className='hidden sm:inline text-xs text-gray-600 dark:text-gray-400'>
                    {state.timeframe}
                  </span>
                </div>
              )}

              {/* Alert Notifications */}
              {user && <AlertNotifications />}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200'
                aria-label={`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
                title={`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                <Icon
                  name={state.theme === 'dark' ? 'sun' : 'moon'}
                  className={`w-5 h-5 ${state.theme === 'dark' ? 'text-yellow-500' : 'text-blue-600'}`}
                />
              </button>

              {/* User Dropdown Menu */}
              {user && <UserDropdown onboardingId='user-menu' />}

              {/* Mobile menu button */}
              <div className='lg:hidden'>
                <button
                  onClick={toggleMobileMenu}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200'
                  aria-label={isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls='mobile-menu'
                >
                  <Icon
                    name={isMobileMenuOpen ? 'x' : 'menu'}
                    className={`w-5 h-5 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <div
            id='mobile-menu'
            className={`lg:hidden transition-all duration-300 ease-in-out ${
              isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            } overflow-hidden`}
            aria-hidden={!isMobileMenuOpen}
          >
            <nav
              className='py-3 space-y-1 border-t border-gray-200 dark:border-gray-800'
              role='navigation'
              aria-label='Mobile navigation'
            >
              {navigation.map(item =>
                item.name === 'Charts' ? (
                  <button
                    key={item.name}
                    onClick={() => {
                      window.open(item.href, '_blank')
                      setIsMobileMenuOpen(false)
                      announceToScreenReader(`Opening ${item.name} in new tab`)
                    }}
                    className={`${
                      item.current
                        ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    } group flex items-center px-4 py-3 text-base font-medium transition-all duration-200 w-full text-left`}
                    aria-current={item.current ? 'page' : undefined}
                  >
                    <Icon name={item.iconName} className='w-5 h-5 mr-3' />
                    {item.name}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      announceToScreenReader(`Navigating to ${item.name}`)
                    }}
                    className={`${
                      item.current
                        ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    } group flex items-center px-4 py-3 text-base font-medium transition-all duration-200`}
                    aria-current={item.current ? 'page' : undefined}
                  >
                    <Icon name={item.iconName} className='w-5 h-5 mr-3' />
                    {item.name}
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Enhanced Loading Overlay with Skeleton */}
      {state.isLoading && (
        <div
          className='fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm'
          role='alert'
          aria-live='assertive'
          aria-label='Loading content'
        >
          <div className='w-full max-w-4xl mx-4 px-6'>
            <div className='text-center mb-8'>
              <div
                className='animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 mx-auto mb-4'
                aria-hidden='true'
              ></div>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
                Loading TradingViewer
              </h2>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Preparing your trading dashboard...
              </p>
            </div>

            {/* Loading Skeleton Preview */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
              {/* Header skeleton */}
              <div className='flex justify-between items-center mb-6'>
                <SkeletonLoader variant='text' width='200px' height='24px' />
                <SkeletonLoader variant='rectangle' width='120px' height='36px' />
              </div>

              {/* Chart skeleton */}
              <div className='mb-6'>
                <SkeletonLoader variant='chart' height='300px' />
              </div>

              {/* List skeleton */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'
                  >
                    <SkeletonLoader variant='text' width='80px' height='16px' className='mb-2' />
                    <SkeletonLoader variant='text' width='120px' height='24px' className='mb-2' />
                    <SkeletonLoader variant='text' width='100px' height='14px' />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Error Display */}
      {state.appError && (
        <div className='mx-4 mt-4'>
          <ErrorDisplay
            error={state.appError.message}
            title={
              state.appError.type === 'network'
                ? 'Connection Problem'
                : state.appError.type === 'api'
                  ? 'Service Issue'
                  : state.appError.type === 'validation'
                    ? 'Invalid Input'
                    : 'Something went wrong'
            }
            actions={[
              ...(state.appError.retryable
                ? [
                    {
                      label: 'Try Again',
                      action: () => window.location.reload(),
                      variant: 'primary' as const,
                      icon: (
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                          />
                        </svg>
                      ),
                    },
                  ]
                : []),
              {
                label: 'Go to Home',
                action: () => (window.location.href = '/'),
                variant: 'outline' as const,
              },
            ]}
            onDismiss={clearAppError}
            showDetails={process.env.NODE_ENV === 'development'}
          />
        </div>
      )}

      {/* Legacy Error Display for backward compatibility */}
      {state.error && !state.appError && (
        <div
          className='bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4 mx-4 mt-4 rounded-r-lg shadow-sm'
          role='alert'
          aria-live='assertive'
        >
          <div className='flex'>
            <div className='flex-shrink-0'>
              <svg
                className='h-5 w-5 text-red-400'
                viewBox='0 0 20 20'
                fill='currentColor'
                aria-hidden='true'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div className='ml-3 flex-1 min-w-0'>
              <p className='text-sm text-red-700 dark:text-red-200 break-words'>{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id='main-content' className='flex-1 overflow-hidden' role='main'>
        <div className='h-full'>{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className='lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb'
        role='navigation'
        aria-label='Bottom navigation'
      >
        <div className='grid grid-cols-5 h-16'>
          {navigation.map(item =>
            item.name === 'Charts' ? (
              <button
                key={item.name}
                onClick={() => window.open(item.href, '_blank')}
                className={`${
                  item.current
                    ? 'text-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                } flex flex-col items-center justify-center space-y-1 transition-colors duration-200`}
                aria-current={item.current ? 'page' : undefined}
                aria-label={`${item.name} - Bottom navigation`}
              >
                <Icon name={item.iconName} className='w-5 h-5' />
                <span className='text-xs font-medium truncate'>{item.name}</span>
              </button>
            ) : (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'text-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                } flex flex-col items-center justify-center space-y-1 transition-colors duration-200`}
                aria-current={item.current ? 'page' : undefined}
                aria-label={`${item.name} - Bottom navigation`}
              >
                <Icon name={item.iconName} className='w-5 h-5' />
                <span className='text-xs font-medium truncate'>{item.name}</span>
              </Link>
            )
          )}
        </div>
      </nav>

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
