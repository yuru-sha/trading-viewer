import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Input } from '@trading-viewer/ui'
import { useAuth } from '../contexts/AuthContext'
import { useErrorHandlers } from '../contexts/ErrorContext'

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const { resetPassword } = useAuth()
  const { handleApiError, showSuccess } = useErrorHandlers()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      navigate('/login')
      return
    }
    setToken(tokenParam)
  }, [searchParams, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      handleApiError({ message: 'Passwords do not match' }, 'Password confirmation')
      return
    }

    if (newPassword.length < 8) {
      handleApiError(
        { message: 'Password must be at least 8 characters long' },
        'Password validation'
      )
      return
    }

    if (!token) {
      handleApiError({ message: 'Invalid reset token' }, 'Token validation')
      return
    }

    setIsLoading(true)

    try {
      await resetPassword({ token, newPassword })
      showSuccess('Password has been reset successfully. Please log in with your new password.')
      navigate('/login')
    } catch (error) {
      handleApiError(error, 'Password reset')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return null
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <div className='flex justify-center mb-6'>
            <div className='w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform'>
              <svg className='w-12 h-12 text-white' fill='currentColor' viewBox='0 0 24 24'>
                <path d='M3 13h2l3-10h4l3 10h2l3-10h4v2h-2.5L18 13.5 15.5 5H12L9 15H6.5L4 5H2v2h1z' />
              </svg>
            </div>
          </div>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
            Set New Password
          </h1>
          <p className='mt-2 text-gray-600 dark:text-gray-400'>
            Please enter your new password below
          </p>
        </div>

        <form
          className='mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl'
          onSubmit={handleSubmit}
        >
          <div className='space-y-5'>
            <div>
              <label
                htmlFor='new-password'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                New Password
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
                  id='new-password'
                  type='password'
                  placeholder='••••••••'
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className='w-full pl-10 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <label
                htmlFor='confirm-password'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                Confirm Password
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
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <Input
                  id='confirm-password'
                  type='password'
                  placeholder='••••••••'
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className='w-full pl-10 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
          </div>

          <div>
            <Button
              type='submit'
              variant='primary'
              size='lg'
              disabled={isLoading || !newPassword || !confirmPassword}
              className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg shadow-lg transform transition hover:scale-105'
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
              ) : (
                'Reset Password'
              )}
            </Button>
          </div>

          <div className='text-center'>
            <button
              type='button'
              onClick={() => navigate('/login')}
              className='text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300'
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
