import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useErrorHandlers } from '../../contexts/ErrorContext'
import LoadingSpinner from '../ui/LoadingSpinner'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const { showSuccess } = useErrorHandlers()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
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
    try {
      await login(formData)
      showSuccess('ログインが成功しました')
      onSuccess?.()
    } catch (error) {
      // Error handling is done in the AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='w-full max-w-md mx-auto'>
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

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSubmitting ? <LoadingSpinner size='small' color='white' /> : 'ログイン'}
        </button>

        {onSwitchToRegister && (
          <div className='text-center'>
            <button
              type='button'
              onClick={onSwitchToRegister}
              className='text-sm text-blue-600 hover:text-blue-500'
            >
              アカウントをお持ちでない場合は新規登録
            </button>
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
