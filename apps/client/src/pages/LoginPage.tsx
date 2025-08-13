import React, { useState, useEffect } from 'react'
import { Button, Input } from '@trading-viewer/ui'
import { useAuth } from '../contexts/AuthContext'
import { useErrorHandlers } from '../contexts/ErrorContext'

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, register, isAuthenticated } = useAuth()
  const { handleApiError, showSuccess } = useErrorHandlers()

  useEffect(() => {
    if (isAuthenticated) {
      window.close()
    }
  }, [isAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        await login({ email, password })
        showSuccess('ログインしました')
      } else {
        await register({ email, password, firstName, lastName })
        showSuccess('アカウントが作成されました')
      }
    } catch (error) {
      handleApiError(error, isLogin ? 'ログイン' : 'アカウント作成')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white'>
            {isLogin ? 'ログイン' : 'アカウント作成'}
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400'>
            TradingViewer へようこそ
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <div>
              <Input
                type='email'
                placeholder='メールアドレス'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='w-full'
              />
            </div>
            <div>
              <Input
                type='password'
                placeholder='パスワード'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className='w-full'
              />
            </div>
            {!isLogin && (
              <>
                <div>
                  <Input
                    type='text'
                    placeholder='名前（任意）'
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className='w-full'
                  />
                </div>
                <div>
                  <Input
                    type='text'
                    placeholder='姓（任意）'
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className='w-full'
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <Button
              type='submit'
              variant='primary'
              size='lg'
              disabled={isLoading}
              className='w-full'
            >
              {isLoading ? '処理中...' : isLogin ? 'ログイン' : 'アカウント作成'}
            </Button>
          </div>

          <div className='text-center'>
            <button
              type='button'
              onClick={() => setIsLogin(!isLogin)}
              className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300'
            >
              {isLogin ? 'アカウントを作成' : 'ログインに戻る'}
            </button>
          </div>

          {/* Test Account */}
          <div className='mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg'>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-2'>テスト用アカウント:</p>
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              Email: test@example.com<br />
              Password: password123
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage