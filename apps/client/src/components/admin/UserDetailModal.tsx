import React, { useState, useEffect } from 'react'
import { Modal, Button, Input, Loading } from '@trading-viewer/ui'
import { useError } from '../../contexts/ErrorContext'
import { apiService } from '../../services/base/ApiService'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'admin' | 'user'
  isEmailVerified: boolean
  isActive: boolean
  failedLoginCount: number
  lockedUntil?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  phoneNumber?: string
  department?: string
  jobTitle?: string
  timezone?: string
  language?: string
  profileImageUrl?: string
}

interface UserDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  onUserUpdate: () => void
}

interface UserUpdateData {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  department?: string
  jobTitle?: string
  timezone?: string
  language?: string
  role?: 'admin' | 'user'
  isActive?: boolean
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  userId,
  onUserUpdate,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UserUpdateData>({})
  const { showError, showSuccess } = useError()

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ]

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ]

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
    }
  }, [isOpen, userId])

  const fetchUserDetails = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await apiService.get<{ success: boolean; data: User }>(
        `/auth/users/${userId}`
      )

      if (response.success) {
        setUser(response.data)
        setFormData({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          phoneNumber: response.data.phoneNumber || '',
          department: response.data.department || '',
          jobTitle: response.data.jobTitle || '',
          timezone: response.data.timezone || 'UTC',
          language: response.data.language || 'en',
          role: response.data.role,
          isActive: response.data.isActive,
        })
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
      showError('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    try {
      setSaving(true)
      await apiService.put(`/auth/users/${userId}`, formData)
      showSuccess('User updated successfully')
      setIsEditing(false)
      fetchUserDetails()
      onUserUpdate()
    } catch (error) {
      console.error('Failed to update user:', error)
      showError('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setIsEditing(false)
    setUser(null)
    setFormData({})
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isUserLocked = (user: User) => {
    return user.lockedUntil && new Date(user.lockedUntil) > new Date()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='User Details'>
      <div className='max-w-2xl'>
        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loading />
            <span className='ml-2'>Loading user details...</span>
          </div>
        ) : user ? (
          <div className='space-y-6'>
            {/* Profile Header */}
            <div className='flex items-center space-x-4 pb-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center'>
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt='Profile'
                    className='w-16 h-16 rounded-full object-cover'
                  />
                ) : (
                  <span className='text-xl font-bold text-gray-700 dark:text-gray-300'>
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400'>{user.email}</p>
                <div className='flex items-center space-x-2 mt-1'>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {user.role}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {user.isEmailVerified && (
                    <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                      ✓ Verified
                    </span>
                  )}
                  {isUserLocked(user) && (
                    <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'>
                      🔒 Locked
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? 'secondary' : 'primary'}
                size='sm'
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {/* Personal Information */}
            <div>
              <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
                Personal Information
              </h4>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    First Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.firstName || ''}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder='Enter first name'
                    />
                  ) : (
                    <p className='text-sm text-gray-900 dark:text-gray-100'>
                      {user.firstName || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Last Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.lastName || ''}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder='Enter last name'
                    />
                  ) : (
                    <p className='text-sm text-gray-900 dark:text-gray-100'>
                      {user.lastName || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.phoneNumber || ''}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder='Enter phone number'
                    />
                  ) : (
                    <p className='text-sm text-gray-900 dark:text-gray-100'>
                      {user.phoneNumber || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Email
                  </label>
                  <p className='text-sm text-gray-900 dark:text-gray-100'>{user.email}</p>
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div>
              <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
                Work Information
              </h4>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Department
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.department || ''}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      placeholder='Enter department'
                    />
                  ) : (
                    <p className='text-sm text-gray-900 dark:text-gray-100'>
                      {user.department || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Job Title
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.jobTitle || ''}
                      onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder='Enter job title'
                    />
                  ) : (
                    <p className='text-sm text-gray-900 dark:text-gray-100'>
                      {user.jobTitle || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
                Preferences
              </h4>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Timezone
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.timezone || 'UTC'}
                      onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    >
                      {timezones.map(tz => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className='text-sm text-gray-900 dark:text-gray-100'>
                      {user.timezone || 'UTC'}
                    </p>
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Language
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.language || 'en'}
                      onChange={e => setFormData({ ...formData, language: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className='text-sm text-gray-900 dark:text-gray-100'>
                      {languages.find(l => l.code === user.language)?.name || 'English'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Settings */}
            {isEditing && (
              <div>
                <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
                  Account Settings
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Role
                    </label>
                    <select
                      value={formData.role || user.role}
                      onChange={e =>
                        setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })
                      }
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    >
                      <option value='user'>User</option>
                      <option value='admin'>Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Status
                    </label>
                    <select
                      value={
                        formData.isActive !== undefined
                          ? formData.isActive.toString()
                          : user.isActive.toString()
                      }
                      onChange={e =>
                        setFormData({ ...formData, isActive: e.target.value === 'true' })
                      }
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    >
                      <option value='true'>Active</option>
                      <option value='false'>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Account Information */}
            <div>
              <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
                Account Information
              </h4>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Created At
                  </label>
                  <p className='text-sm text-gray-900 dark:text-gray-100'>
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Last Login
                  </label>
                  <p className='text-sm text-gray-900 dark:text-gray-100'>
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Failed Login Attempts
                  </label>
                  <p className='text-sm text-gray-900 dark:text-gray-100'>
                    {user.failedLoginCount}
                  </p>
                </div>
                {isUserLocked(user) && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Locked Until
                    </label>
                    <p className='text-sm text-red-600 dark:text-red-400'>
                      {formatDate(user.lockedUntil!)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
                <Button onClick={() => setIsEditing(false)} variant='secondary'>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className='text-center py-8'>
            <p className='text-gray-500'>User not found</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default UserDetailModal
