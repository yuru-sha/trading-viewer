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
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h1
            ref={headerRef}
            className='mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white'
            tabIndex={-1}
            id='page-title'
          >
            {isLogin ? 'ログイン' : 'アカウント作成'}
          </h1>
          <p
            className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400'
            id='page-description'
          >
            TradingViewer へようこそ
          </p>
        </div>
        <form
          ref={formRef}
          className='mt-8 space-y-6'
          onSubmit={handleSubmit}
          aria-labelledby='page-title'
          aria-describedby='page-description'
          noValidate
        >
          <fieldset className='space-y-4'>
            <legend className='sr-only'>{isLogin ? 'ログイン情報' : 'アカウント作成情報'}</legend>
            <div>
              <label htmlFor='email' className='sr-only'>
                メールアドレス
              </label>
              <Input
                id='email'
                type='email'
                placeholder='メールアドレス'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete='email'
                aria-describedby='email-error'
                className='w-full'
              />
            </div>
            <div>
              <label htmlFor='password' className='sr-only'>
                パスワード
              </label>
              <Input
                id='password'
                type='password'
                placeholder='パスワード'
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                aria-describedby='password-error'
                className='w-full'
              />
            </div>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor='firstName' className='sr-only'>
                    名前（任意）
                  </label>
                  <Input
                    id='firstName'
                    type='text'
                    placeholder='名前（任意）'
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    autoComplete='given-name'
                    className='w-full'
                  />
                </div>
                <div>
                  <label htmlFor='lastName' className='sr-only'>
                    姓（任意）
                  </label>
                  <Input
                    id='lastName'
                    type='text'
                    placeholder='姓（任意）'
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    autoComplete='family-name'
                    className='w-full'
                  />
                </div>
              </>
            )}
          </fieldset>

          <div>
            <Button
              type='submit'
              variant='primary'
              size='lg'
              disabled={isLoading}
              className='w-full'
              aria-describedby={isLoading ? 'loading-status' : undefined}
            >
              {isLoading ? '処理中...' : isLogin ? 'ログイン' : 'アカウント作成'}
            </Button>
            {isLoading && (
              <div id='loading-status' className='sr-only' aria-live='polite'>
                {isLogin ? 'ログイン' : 'アカウント作成'}を処理中です
              </div>
            )}
          </div>

          <div className='text-center'>
            <button
              type='button'
              onClick={() => setIsLogin(!isLogin)}
              className={`text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 ${prefersReducedMotion ? '' : 'transition-colors duration-200'}`}
              aria-describedby='toggle-mode-description'
            >
              {isLogin ? 'アカウントを作成' : 'ログインに戻る'}
            </button>
            <div id='toggle-mode-description' className='sr-only'>
              {isLogin ? 'アカウント作成フォームに切り替える' : 'ログインフォームに切り替える'}
            </div>
          </div>

          {/* Test Accounts */}
          <section className='mt-6 space-y-3' aria-labelledby='test-accounts-title'>
            <h2 id='test-accounts-title' className='sr-only'>
              テスト用アカウント情報
            </h2>
            <div
              className='p-4 bg-gray-100 dark:bg-gray-800 rounded-lg'
              role='region'
              aria-labelledby='test-account-label'
            >
              <p
                id='test-account-label'
                className='text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium'
              >
                テスト用アカウント:
              </p>
              <div className='text-xs text-gray-600 dark:text-gray-400'>
                <div>Email: test@example.com</div>
                <div>Password: password123</div>
              </div>
            </div>
            <div
              className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'
              role='region'
              aria-labelledby='admin-account-label'
            >
              <p
                id='admin-account-label'
                className='text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium'
              >
                管理者アカウント:
              </p>
              <div className='text-xs text-blue-700 dark:text-blue-300'>
                <div>Email: admin@tradingviewer.com</div>
                <div>Password: admin123!</div>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
