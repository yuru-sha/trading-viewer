import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@trading-viewer/ui'
import Input from '../components/Input'
import { useAuth } from '../contexts/AuthContext'
import { useErrorHandlers } from '../contexts/ErrorContext'
import { useAccessibility } from '../hooks/useAccessibility'

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false)
  const { login, register, forgotPassword } = useAuth()
  const { handleApiError, showSuccess } = useErrorHandlers()

  // Accessibility enhancement
  const { announceToScreenReader, focusElement, prefersReducedMotion } = useAccessibility()
  const formRef = useRef<HTMLFormElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)

  // Focus management and announcements
  useEffect(() => {
    // Announce page change
    announceToScreenReader(`${isLogin ? 'Login' : 'Sign up'} page`)

    // Focus header for screen readers
    if (headerRef.current) {
      focusElement(headerRef.current)
    }
  }, [isLogin, announceToScreenReader, focusElement])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Announce start of processing
    announceToScreenReader(`Processing ${isLogin ? 'login' : 'account creation'}`, 'assertive')

    try {
      if (isLogin) {
        await login({ email, password })
        showSuccess('Successfully logged in')
        announceToScreenReader('Login completed successfully', 'assertive')
      } else {
        await register({ email, password })
        showSuccess('Account created successfully')
        announceToScreenReader('Account creation completed successfully', 'assertive')
      }
    } catch {
      handleApiError(error, isLogin ? 'Login' : 'Account creation')
      announceToScreenReader(
        `An error occurred during ${isLogin ? 'login' : 'account creation'}`,
        'assertive'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsForgotPasswordLoading(true)

    try {
      await forgotPassword({ email: forgotPasswordEmail })
      showSuccess('Password reset link has been sent to your email address.')
      setShowForgotPassword(false)
      setForgotPasswordEmail('')
    } catch {
      handleApiError(error, 'Password reset request')
    } finally {
      setIsForgotPasswordLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex'>
      {/* Left Side - Login Form */}
      <div className='flex-1 flex items-center justify-center bg-white dark:bg-gray-900 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          {/* Logo and Title */}
          <div className='text-center'>
            <div className='flex justify-center mb-6'>
              <div className='w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform'>
                <svg className='w-12 h-12 text-white' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M3 13h2l3-10h4l3 10h2l3-10h4v2h-2.5L18 13.5 15.5 5H12L9 15H6.5L4 5H2v2h1z' />
                </svg>
              </div>
            </div>
            <h1
              ref={headerRef}
              className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
              tabIndex={-1}
              id='page-title'
            >
              TradingViewer
            </h1>
            <p className='mt-2 text-gray-600 dark:text-gray-400' id='page-description'>
              {isLogin ? 'Sign in to your account' : 'Create a new account'}
            </p>
          </div>
          {/* Form */}
          <form
            ref={formRef}
            className='mt-10 space-y-6 bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl shadow-xl'
            onSubmit={handleSubmit}
            aria-labelledby='page-title'
            aria-describedby='page-description'
            noValidate
          >
            <fieldset className='space-y-5'>
              <legend className='sr-only'>
                {isLogin ? 'Login information' : 'Account creation information'}
              </legend>

              {/* Email Input */}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
                >
                  Email Address
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <svg
                      className='h-5 w-5 text-gray-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'
                      />
                    </svg>
                  </div>
                  <Input
                    id='email'
                    type='email'
                    placeholder='email@example.com'
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    autoComplete='email'
                    aria-describedby='email-error'
                    className='w-full pl-10 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <svg
                      className='h-5 w-5 text-gray-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                      />
                    </svg>
                  </div>
                  <Input
                    id='password'
                    type='password'
                    placeholder='••••••••'
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    aria-describedby='password-error'
                    className='w-full pl-10 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              {isLogin && (
                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <input
                      id='remember-me'
                      name='remember-me'
                      type='checkbox'
                      checked={rememberMe}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRememberMe(e.target.checked)
                      }
                      className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                    />
                    <label
                      htmlFor='remember-me'
                      className='ml-2 block text-sm text-gray-700 dark:text-gray-300'
                    >
                      Remember me
                    </label>
                  </div>
                  <button
                    type='button'
                    onClick={() => setShowForgotPassword(true)}
                    className='text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300'
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </fieldset>

            {/* Submit Button */}
            <div>
              <Button
                type='submit'
                variant='primary'
                size='lg'
                disabled={isLoading}
                className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg shadow-lg transform transition hover:scale-105'
                aria-describedby={isLoading ? 'loading-status' : undefined}
              >
                {isLoading ? (
                  <div className='flex items-center justify-center'>
                    <svg
                      className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    Processing...
                  </div>
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
              {isLoading && (
                <div id='loading-status' className='sr-only' aria-live='polite'>
                  Processing {isLogin ? 'login' : 'account creation'}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300 dark:border-gray-600' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-gray-50 dark:bg-gray-800 text-gray-500'>or</span>
              </div>
            </div>

            {/* Toggle Login/Signup */}
            <div className='text-center'>
              <button
                type='button'
                onClick={() => setIsLogin(!isLogin)}
                className={`text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 ${prefersReducedMotion ? '' : 'transition-colors duration-200'}`}
                aria-describedby='toggle-mode-description'
              >
                {isLogin ? 'Create new account' : 'Already have an account?'}
              </button>
              <div id='toggle-mode-description' className='sr-only'>
                {isLogin ? 'Switch to account creation form' : 'Switch to login form'}
              </div>
            </div>

            {/* Test Accounts */}
            <section className='space-y-3' aria-labelledby='test-accounts-title'>
              <h2
                id='test-accounts-title'
                className='text-xs font-medium text-gray-500 text-center'
              >
                Demo Accounts
              </h2>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  type='button'
                  onClick={() => {
                    setEmail('test@example.com')
                    setPassword('password123')
                    setIsLogin(true)
                  }}
                  className='p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left'
                  aria-label='Auto-fill with test account'
                >
                  <div className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    👤 Regular User
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400'>test@example.com</div>
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setEmail('admin@tradingviewer.com')
                    setPassword('Admin123!')
                    setIsLogin(true)
                  }}
                  className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left border border-blue-200 dark:border-blue-800'
                  aria-label='Auto-fill with admin account'
                >
                  <div className='text-xs font-medium text-blue-700 dark:text-blue-300 mb-1'>
                    👑 Administrator
                  </div>
                  <div className='text-xs text-blue-600 dark:text-blue-400'>
                    admin@tradingviewer.com
                  </div>
                </button>
              </div>
            </section>
          </form>
        </div>
      </div>

      {/* Right Side - Background Image/Pattern */}
      <div className='hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500'>
        <div className='absolute inset-0 bg-black opacity-20' />
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-white text-center px-8'>
            <h2 className='text-4xl font-bold mb-4'>Real-time Market Data</h2>
            <p className='text-xl mb-8'>Analyze markets with professional trading tools</p>
            <div className='grid grid-cols-2 gap-4 max-w-md mx-auto'>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>📊</div>
                <div className='text-sm font-medium'>Advanced Chart Analysis</div>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>⚡</div>
                <div className='text-sm font-medium'>Real-time Updates</div>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>🎯</div>
                <div className='text-sm font-medium'>Technical Indicators</div>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>🔔</div>
                <div className='text-sm font-medium'>Price Alerts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Chart Pattern */}
        <svg
          className='absolute bottom-0 left-0 w-full h-64 opacity-20'
          viewBox='0 0 400 100'
          preserveAspectRatio='none'
        >
          <path
            d='M0,50 C50,20 100,60 150,40 C200,20 250,70 300,50 C350,30 400,60 400,50 L400,100 L0,100 Z'
            fill='white'
            className='animate-pulse'
          />
        </svg>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl'>
            <div className='text-center mb-6'>
              <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                Reset Password
              </h2>
              <p className='text-gray-600 dark:text-gray-400'>
                Enter your email address and we&apos;ll send you a reset link
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className='space-y-6'>
              <div>
                <label
                  htmlFor='forgot-email'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
                >
                  Email Address
                </label>
                <Input
                  id='forgot-email'
                  type='email'
                  placeholder='email@example.com'
                  value={forgotPasswordEmail}
                  onChange={e => setForgotPasswordEmail(e.target.value)}
                  required
                  className='w-full py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>

              <div className='flex space-x-4'>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotPasswordEmail('')
                  }}
                  className='flex-1 py-3'
                  disabled={isForgotPasswordLoading}
                >
                  Cancel
                </Button>
                <Button
                  type='submit'
                  variant='primary'
                  disabled={isForgotPasswordLoading || !forgotPasswordEmail}
                  className='flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                >
                  {isForgotPasswordLoading ? (
                    <div className='flex items-center justify-center'>
                      <svg
                        className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                        fill='none'
                        viewBox='0 0 24 24'
                      >
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                        />
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        />
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage
