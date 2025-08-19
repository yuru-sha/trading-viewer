import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp, useAppActions } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../Icon'
import UserDropdown from '../UserDropdown'
import AlertNotifications from '../alerts/AlertNotifications'

interface NavigationItem {
  name: string
  href: string
  current: boolean
  iconName: 'heart' | 'trending' | 'chart' | 'search' | 'bell' | 'users'
}

interface HeaderProps {
  navigation: NavigationItem[]
  isMobileMenuOpen: boolean
  onToggleMobileMenu: () => void
  onMobileNavigate: (message: string) => void
}

export const Header: React.FC<HeaderProps> = ({
  navigation,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onMobileNavigate,
}) => {
  const { state } = useApp()
  const { setTheme } = useAppActions()
  const { user } = useAuth()

  const toggleTheme = () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark')
  }

  return (
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
                className='w-5 h-5 text-gray-600 dark:text-gray-400'
              />
            </button>

            {/* User Dropdown Menu */}
            {user && <UserDropdown onboardingId='user-menu' />}

            {/* Mobile menu button */}
            <div className='lg:hidden'>
              <button
                onClick={onToggleMobileMenu}
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
                    onMobileNavigate(`Opening ${item.name} in new tab`)
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
                  onClick={() => onMobileNavigate(`Navigating to ${item.name}`)}
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
  )
}
