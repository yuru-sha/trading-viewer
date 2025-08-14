import React, { useState, useEffect, useRef } from 'react'
import { Button, Input } from '@trading-viewer/ui'
import { useAuth } from '../contexts/AuthContext'
import { useErrorHandlers } from '../contexts/ErrorContext'
import { useAccessibility } from '../hooks/useAccessibility'

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login, register, isAuthenticated } = useAuth()
  const { handleApiError, showSuccess } = useErrorHandlers()

  // Accessibility enhancement
  const { announceToScreenReader, focusElement, prefersReducedMotion } = useAccessibility()
  const formRef = useRef<HTMLFormElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)

  // Focus management and announcements
  useEffect(() => {
    // Announce page change
    announceToScreenReader(`${isLogin ? 'ログイン' : 'アカウント作成'}ページです`)

    // Focus header for screen readers
    if (headerRef.current) {
      focusElement(headerRef.current)
    }
  }, [isLogin, announceToScreenReader, focusElement])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Announce start of processing
    announceToScreenReader(`${isLogin ? 'ログイン' : 'アカウント作成'}を処理中です`, 'assertive')

    try {
      if (isLogin) {
        await login({ email, password })
        showSuccess('ログインしました')
        announceToScreenReader('ログインが完了しました', 'assertive')
      } else {
        await register({ email, password, firstName, lastName })
        showSuccess('アカウントが作成されました')
        announceToScreenReader('アカウント作成が完了しました', 'assertive')
      }
    } catch (error) {
      handleApiError(error, isLogin ? 'ログイン' : 'アカウント作成')
      announceToScreenReader(
        `${isLogin ? 'ログイン' : 'アカウント作成'}でエラーが発生しました`,
        'assertive'
      )
    } finally {
      setIsLoading(false)
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
              {isLogin ? 'アカウントにサインイン' : '新規アカウントを作成'}
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
              <legend className='sr-only'>{isLogin ? 'ログイン情報' : 'アカウント作成情報'}</legend>
              
              {/* Email Input */}
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  メールアドレス
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <svg className='h-5 w-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207' />
                    </svg>
                  </div>
                  <Input
                    id='email'
                    type='email'
                    placeholder='email@example.com'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete='email'
                    aria-describedby='email-error'
                    className='w-full pl-10 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor='password' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  パスワード
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <svg className='h-5 w-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                    </svg>
                  </div>
                  <Input
                    id='password'
                    type='password'
                    placeholder='••••••••'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    aria-describedby='password-error'
                    className='w-full pl-10 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              </div>
              {!isLogin && (
                <>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label htmlFor='firstName' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                        名前（任意）
                      </label>
                      <Input
                        id='firstName'
                        type='text'
                        placeholder='太郎'
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        autoComplete='given-name'
                        className='w-full py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label htmlFor='lastName' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                        姓（任意）
                      </label>
                      <Input
                        id='lastName'
                        type='text'
                        placeholder='山田'
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        autoComplete='family-name'
                        className='w-full py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Remember Me & Forgot Password */}
              {isLogin && (
                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <input
                      id='remember-me'
                      name='remember-me'
                      type='checkbox'
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                    />
                    <label htmlFor='remember-me' className='ml-2 block text-sm text-gray-700 dark:text-gray-300'>
                      ログイン状態を保持
                    </label>
                  </div>
                  <button type='button' className='text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300'>
                    パスワードを忘れた？
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
                    <svg className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                    </svg>
                    処理中...
                  </div>
                ) : (
                  isLogin ? 'サインイン' : 'アカウント作成'
                )}
              </Button>
              {isLoading && (
                <div id='loading-status' className='sr-only' aria-live='polite'>
                  {isLogin ? 'ログイン' : 'アカウント作成'}を処理中です
                </div>
              )}
            </div>

            {/* Divider */}
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300 dark:border-gray-600' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-gray-50 dark:bg-gray-800 text-gray-500'>または</span>
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
                {isLogin ? '新規アカウントを作成する' : 'すでにアカウントをお持ちの方'}
              </button>
              <div id='toggle-mode-description' className='sr-only'>
                {isLogin ? 'アカウント作成フォームに切り替える' : 'ログインフォームに切り替える'}
              </div>
            </div>

            {/* Test Accounts */}
            <section className='space-y-3' aria-labelledby='test-accounts-title'>
              <h2 id='test-accounts-title' className='text-xs font-medium text-gray-500 text-center'>
                デモアカウント
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
                  role='button'
                  aria-label='テストアカウントで自動入力'
                >
                  <div className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>👤 一般ユーザー</div>
                  <div className='text-xs text-gray-500 dark:text-gray-400'>test@example.com</div>
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setEmail('admin@tradingviewer.com')
                    setPassword('admin123!')
                    setIsLogin(true)
                  }}
                  className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left border border-blue-200 dark:border-blue-800'
                  role='button'
                  aria-label='管理者アカウントで自動入力'
                >
                  <div className='text-xs font-medium text-blue-700 dark:text-blue-300 mb-1'>👑 管理者</div>
                  <div className='text-xs text-blue-600 dark:text-blue-400'>admin@tradingviewer.com</div>
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
            <h2 className='text-4xl font-bold mb-4'>リアルタイムマーケットデータ</h2>
            <p className='text-xl mb-8'>プロフェッショナルな取引ツールで市場を分析</p>
            <div className='grid grid-cols-2 gap-4 max-w-md mx-auto'>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>📊</div>
                <div className='text-sm font-medium'>高度なチャート分析</div>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>⚡</div>
                <div className='text-sm font-medium'>リアルタイム更新</div>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>🎯</div>
                <div className='text-sm font-medium'>テクニカル指標</div>
              </div>
              <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
                <div className='text-3xl mb-2'>🔔</div>
                <div className='text-sm font-medium'>価格アラート</div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Chart Pattern */}
        <svg className='absolute bottom-0 left-0 w-full h-64 opacity-20' viewBox='0 0 400 100' preserveAspectRatio='none'>
          <path
            d='M0,50 C50,20 100,60 150,40 C200,20 250,70 300,50 C350,30 400,60 400,50 L400,100 L0,100 Z'
            fill='white'
            className='animate-pulse'
          />
        </svg>
      </div>
    </div>
  )
}

export default LoginPage
