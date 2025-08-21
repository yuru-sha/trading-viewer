import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useErrorHandlers } from '../../contexts/ErrorContext'
import LoadingSpinner from '../ui/LoadingSpinner'

const UserProfile: React.FC = () => {
  const { user, logout, updateProfile, changePassword, deleteAccount } = useAuth()
  const { showSuccess, showWarning } = useErrorHandlers()

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'danger'>('profile')
  const [isLoading, setIsLoading] = useState(false)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    avatar: user?.avatar || '',
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!user) {
    return <div>ユーザー情報を読み込み中...</div>
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateProfile(profileForm)
      showSuccess('プロフィールを更新しました')
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const newErrors: Record<string, string> = {}

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = '現在のパスワードは必須です'
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = '新しいパスワードは必須です'
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = 'パスワードは 8 文字以上である必要があります'
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsLoading(true)

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      showSuccess('パスワードを変更しました。再度ログインしてください。')
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'アカウントを削除すると、すべてのデータが失われます。この操作は取り消せません。続行しますか？'
    )

    if (!confirmed) return

    setIsLoading(true)

    try {
      await deleteAccount()
      showWarning('アカウントが削除されました')
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      showSuccess('ログアウトしました')
    } catch {
      // Error handled by context
    }
  }

  const tabClasses = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-md ${
      activeTab === tab
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <div className='bg-white shadow rounded-lg'>
        <div className='px-6 py-4 border-b border-gray-200'>
          <h1 className='text-2xl font-bold text-gray-900'>アカウント設定</h1>
          <p className='mt-1 text-sm text-gray-600'>プロフィール情報とセキュリティ設定を管理</p>
        </div>

        {/* Tabs */}
        <div className='px-6 py-4 border-b border-gray-200'>
          <nav className='flex space-x-2'>
            <button onClick={() => setActiveTab('profile')} className={tabClasses('profile')}>
              プロフィール
            </button>
            <button onClick={() => setActiveTab('security')} className={tabClasses('security')}>
              セキュリティ
            </button>
            <button onClick={() => setActiveTab('danger')} className={tabClasses('danger')}>
              アカウント管理
            </button>
          </nav>
        </div>

        <div className='px-6 py-6'>
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className='space-y-6'>
              <div>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>基本情報</h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label htmlFor='email' className='block text-sm font-medium text-gray-700'>
                      メールアドレス
                    </label>
                    <input
                      id='email'
                      type='email'
                      value={user.email}
                      disabled
                      className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500'
                    />
                    <p className='mt-1 text-sm text-gray-500'>メールアドレスは変更できません</p>
                  </div>

                  <div>
                    <label htmlFor='role' className='block text-sm font-medium text-gray-700'>
                      ロール
                    </label>
                    <input
                      id='role'
                      type='text'
                      value={user.role === 'admin' ? '管理者' : 'ユーザー'}
                      disabled
                      className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500'
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='displayName'
                      className='block text-sm font-medium text-gray-700'
                    >
                      表示名
                    </label>
                    <input
                      id='displayName'
                      type='text'
                      value={profileForm.name}
                      onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder='表示名（任意）'
                      className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500'
                    />
                  </div>
                </div>
              </div>

              <div className='flex justify-end'>
                <button
                  type='submit'
                  disabled={isLoading}
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50'
                >
                  {isLoading ? <LoadingSpinner size='small' color='white' /> : 'プロフィール更新'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className='space-y-6'>
              <div>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>パスワード変更</h3>

                <form onSubmit={handlePasswordChange} className='space-y-4'>
                  <div>
                    <label
                      htmlFor='currentPassword'
                      className='block text-sm font-medium text-gray-700'
                    >
                      現在のパスワード
                    </label>
                    <input
                      id='currentPassword'
                      type='password'
                      value={passwordForm.currentPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 ${
                        errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.currentPassword && (
                      <p className='mt-1 text-sm text-red-600'>{errors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor='newPassword'
                      className='block text-sm font-medium text-gray-700'
                    >
                      新しいパスワード
                    </label>
                    <input
                      id='newPassword'
                      type='password'
                      value={passwordForm.newPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))
                      }
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 ${
                        errors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.newPassword && (
                      <p className='mt-1 text-sm text-red-600'>{errors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor='confirmPassword'
                      className='block text-sm font-medium text-gray-700'
                    >
                      新しいパスワード（確認）
                    </label>
                    <input
                      id='confirmPassword'
                      type='password'
                      value={passwordForm.confirmPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className='mt-1 text-sm text-red-600'>{errors.confirmPassword}</p>
                    )}
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading}
                    className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50'
                  >
                    {isLoading ? <LoadingSpinner size='small' color='white' /> : 'パスワード変更'}
                  </button>
                </form>
              </div>

              <div className='border-t border-gray-200 pt-6'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>セッション管理</h3>
                <button
                  onClick={handleLogout}
                  className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                >
                  ログアウト
                </button>
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className='space-y-6'>
              <div>
                <h3 className='text-lg font-medium text-red-900 mb-4'>危険な操作</h3>

                <div className='bg-red-50 border border-red-200 rounded-md p-4'>
                  <div className='flex'>
                    <div className='flex-shrink-0'>
                      <svg
                        className='h-5 w-5 text-red-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z'
                        />
                      </svg>
                    </div>
                    <div className='ml-3'>
                      <h3 className='text-sm font-medium text-red-800'>アカウント削除</h3>
                      <p className='mt-2 text-sm text-red-700'>
                        アカウントを削除すると、すべてのデータが完全に削除され、復元できません。
                        この操作は取り消すことができませんので、十分にご注意ください。
                      </p>
                      <div className='mt-4'>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={isLoading}
                          className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50'
                        >
                          {isLoading ? (
                            <LoadingSpinner size='small' color='white' />
                          ) : (
                            'アカウントを削除'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile
