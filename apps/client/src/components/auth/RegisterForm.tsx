import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useErrorHandlers } from '../../contexts/ErrorContext'
import LoadingSpinner from '../ui/LoadingSpinner'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register } = useAuth()
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

    // Email validation
    if (!formData.email) {
      newErrors.email = 'メールアドレスは必須です'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'パスワードは必須です'
    } else {
      if (formData.password.length < 8) {
        newErrors.password = 'パスワードは 8 文字以上である必要があります'
      } else if (!/(?=.*[a-z])/.test(formData.password)) {
        newErrors.password = 'パスワードには小文字を含める必要があります'
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        newErrors.password = 'パスワードには大文字を含める必要があります'
      } else if (!/(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'パスワードには数字を含める必要があります'
      } else if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password)) {
        newErrors.password = 'パスワードには特殊文字を含める必要があります'
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードの確認は必須です'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません'
    }

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = '名前は必須です'
    } else if (formData.firstName.length > 50) {
      newErrors.firstName = '名前は 50 文字以内で入力してください'
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = '苗字は必須です'
    } else if (formData.lastName.length > 50) {
      newErrors.lastName = '苗字は 50 文字以内で入力してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const { confirmPassword, ...registerData } = formData
      await register(registerData)
      showSuccess('アカウントが正常に作成されました')
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
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label htmlFor='firstName' className='block text-sm font-medium text-gray-700'>
              名前
            </label>
            <input
              id='firstName'
              name='firstName'
              type='text'
              autoComplete='given-name'
              required
              value={formData.firstName}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder='太郎'
            />
            {errors.firstName && <p className='mt-1 text-sm text-red-600'>{errors.firstName}</p>}
          </div>

          <div>
            <label htmlFor='lastName' className='block text-sm font-medium text-gray-700'>
              苗字
            </label>
            <input
              id='lastName'
              name='lastName'
              type='text'
              autoComplete='family-name'
              required
              value={formData.lastName}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastName
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder='田中'
            />
            {errors.lastName && <p className='mt-1 text-sm text-red-600'>{errors.lastName}</p>}
          </div>
        </div>

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
            placeholder='user@example.com'
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
            autoComplete='new-password'
            required
            value={formData.password}
            onChange={handleInputChange}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder='8 文字以上で大小文字、数字、特殊文字を含む'
          />
          {errors.password && <p className='mt-1 text-sm text-red-600'>{errors.password}</p>}
        </div>

        <div>
          <label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700'>
            パスワード確認
          </label>
          <input
            id='confirmPassword'
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            required
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirmPassword
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder='パスワードを再入力'
          />
          {errors.confirmPassword && (
            <p className='mt-1 text-sm text-red-600'>{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSubmitting ? <LoadingSpinner size='small' color='white' /> : 'アカウント作成'}
        </button>

        {onSwitchToLogin && (
          <div className='text-center'>
            <button
              type='button'
              onClick={onSwitchToLogin}
              className='text-sm text-blue-600 hover:text-blue-500'
            >
              既にアカウントをお持ちの場合はログイン
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

export default RegisterForm
