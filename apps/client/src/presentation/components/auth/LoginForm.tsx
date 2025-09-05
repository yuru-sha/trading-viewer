import React, { useState } from 'react'
import { useAuth } from '@/presentation/context/AuthContext'
import { useErrorHandlers } from '@/presentation/context/ErrorContext'
import LoadingSpinner from '@/presentation/components/ui/LoadingSpinner'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
  onSwitchToForgotPassword?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string>('')

  const { login } = useAuth()
  const { showSuccess } = useErrorHandlers()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    // Clear login error when user starts typing
    if (loginError) {
      setLoginError('')
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'メールアドレスは必須です'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません'
    }

    if (!formData.password) {
      newErrors.password = 'パスワードは必須です'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setLoginError('') // Clear previous login error

    try {
      await login(formData)
      showSuccess('ログインが成功しました')
      onSuccess?.()
    } catch (error: unknown) {
      // Handle specific login errors
      let errorMessage = 'ログインに失敗しました。'

      const httpError = error as {
        response?: { status?: number; data?: { message?: string } }
        message?: string
      }

      if (httpError?.response?.status === 401) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。'
      } else if (httpError?.response?.status === 423) {
        errorMessage = 'アカウントがロックされています。しばらく待ってから再度お試しください。'
      } else if (httpError?.response?.status === 429) {
        errorMessage = 'ログイン試行回数が制限を超えました。しばらく待ってから再度お試しください。'
      } else if (httpError?.response?.data?.message) {
        errorMessage = httpError.response.data.message
      } else if (httpError?.message) {
        errorMessage = httpError.message
      }

      setLoginError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      {/* Login Error Message */}
      {loginError && (
        <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md'>
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
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>ログインエラー</h3>
              <div className='mt-1 text-sm text-red-700 dark:text-red-300'>{loginError}</div>
            </div>
            <div className='ml-auto pl-3'>
              <div className='-mx-1.5 -my-1.5'>
                <button
                  type='button'
                  onClick={() => setLoginError('')}
                  className='inline-flex rounded-md bg-red-50 dark:bg-red-900/20 p-1.5 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50 dark:focus:ring-offset-red-900'
                >
                  <span className='sr-only'>閉じる</span>
                  <svg
                    className='h-5 w-5'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                    aria-hidden='true'
                  >
                    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div>
          <label htmlFor='email' className='block text-sm font-medium text-gray-700'>
            メールアドレス
          </label>
          <input
            id='email'
            name='email'
            type='email'
            autoComplete='email'
            required
            value={formData.email}
            onChange={handleInputChange}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder='例: user@example.com'
          />
          {errors.email && <p className='mt-1 text-sm text-red-600'>{errors.email}</p>}
        </div>

        <div>
          <label htmlFor='password' className='block text-sm font-medium text-gray-700'>
            パスワード
          </label>
          <input
            id='password'
            name='password'
            type='password'
            autoComplete='current-password'
            required
            value={formData.password}
            onChange={handleInputChange}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder='パスワードを入力'
          />
          {errors.password && <p className='mt-1 text-sm text-red-600'>{errors.password}</p>}
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            <input
              id='rememberMe'
              name='rememberMe'
              type='checkbox'
              checked={formData.rememberMe}
              onChange={handleInputChange}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
            />
            <label htmlFor='rememberMe' className='ml-2 block text-sm text-gray-900'>
              ログインを保持
            </label>
          </div>

          {onSwitchToForgotPassword && (
            <div className='text-sm'>
              <button
                type='button'
                onClick={onSwitchToForgotPassword}
                className='font-medium text-blue-600 hover:text-blue-500'
              >
                パスワードをお忘れですか？
              </button>
            </div>
          )}
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSubmitting ? <LoadingSpinner size='small' color='white' /> : 'ログイン'}
        </button>

        {onSwitchToRegister && (
          <div className='text-center'>
            <span className='text-sm text-gray-600'>
              アカウントをお持ちでない場合は{' '}
              <button
                type='button'
                onClick={onSwitchToRegister}
                className='font-medium text-blue-600 hover:text-blue-500'
              >
                新規登録
              </button>
            </span>
          </div>
        )}
      </form>

      {/* Development hint */}
      {process.env.NODE_ENV === 'development' && (
        <div className='mt-6 p-4 bg-gray-100 rounded-md'>
          <p className='text-sm text-gray-600 mb-2'>開発用テストアカウント:</p>
          <div className='space-y-1 text-xs text-gray-500'>
            <div>管理者: admin@tradingviewer.com / admin123!</div>
            <div>ユーザー: user1@test.com / Test123!</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginForm
