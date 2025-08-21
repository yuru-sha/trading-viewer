import React, { useState } from 'react'
import { Modal, Button, Input } from '@trading-viewer/ui'
import { useError } from '../../contexts/ErrorContext'
import { apiService } from '../../services/base/ApiService'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: () => void
}

interface CreateUserData {
  email: string
  role: 'admin' | 'user'
  sendWelcomeEmail: boolean
  temporaryPassword?: string
  generatePassword: boolean
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    role: 'user',
    sendWelcomeEmail: true,
    temporaryPassword: '',
    generatePassword: true,
  })
  const [creating, setCreating] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const { showError, showSuccess } = useError()

  const handleInputChange = (field: keyof CreateUserData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const generateRandomPassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  const handleGeneratePassword = () => {
    const password = generateRandomPassword()
    setFormData(prev => ({ ...prev, temporaryPassword: password }))
    setGeneratedPassword(password)
  }

  const validateForm = (): string | null => {
    if (!formData.email.trim()) return 'Email is required'

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address'

    if (!formData.generatePassword && !formData.temporaryPassword.trim()) {
      return 'Please provide a temporary password or enable password generation'
    }

    if (!formData.generatePassword && formData.temporaryPassword.length < 8) {
      return 'Password must be at least 8 characters long'
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      showError(validationError)
      return
    }

    try {
      setCreating(true)

      const submitData = {
        ...formData,
        temporaryPassword: formData.generatePassword
          ? generateRandomPassword()
          : formData.temporaryPassword,
      }

      const response = await apiService.post<{
        success: boolean
        data: { user: unknown; temporaryPassword?: string }
      }>('/auth/users', submitData)

      if (response.success) {
        showSuccess('User created successfully')
        if (response.data.temporaryPassword) {
          setGeneratedPassword(response.data.temporaryPassword)
        }
        onUserCreated()
        handleClose()
      }
    } catch (error: unknown) {
      console.error('Failed to create user:', error)
      const errorMessage =
        error instanceof Error &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data
          ? String(error.response.data.message)
          : 'Failed to create user'
      showError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setFormData({
      email: '',
      role: 'user',
      sendWelcomeEmail: true,
      temporaryPassword: '',
      generatePassword: true,
    })
    setGeneratedPassword(null)
    onClose()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showSuccess('Copied to clipboard')
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Create New User'>
      <div className='max-w-lg space-y-6'>
        {/* Basic Information */}
        <div>
          <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
            Basic Information
          </h4>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                Email Address *
              </label>
              <Input
                id='email'
                type='email'
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder='user@example.com'
                required
              />
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div>
          <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
            Account Settings
          </h4>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='role'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                Role
              </label>
              <select
                id='role'
                value={formData.role}
                onChange={e => handleInputChange('role', e.target.value as 'admin' | 'user')}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              >
                <option value='user'>User</option>
                <option value='admin'>Administrator</option>
              </select>
            </div>
          </div>
        </div>

        {/* Password Settings */}
        <div>
          <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
            Password Settings
          </h4>
          <div className='space-y-4'>
            <div className='flex items-center'>
              <input
                type='checkbox'
                id='generatePassword'
                checked={formData.generatePassword}
                onChange={e => handleInputChange('generatePassword', e.target.checked)}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
              />
              <label
                htmlFor='generatePassword'
                className='ml-2 block text-sm text-gray-900 dark:text-gray-100'
              >
                Generate random password automatically
              </label>
            </div>

            {!formData.generatePassword && (
              <div>
                <label
                  htmlFor='temporaryPassword'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                >
                  Temporary Password *
                </label>
                <div className='flex space-x-2'>
                  <Input
                    id='temporaryPassword'
                    type='password'
                    value={formData.temporaryPassword || ''}
                    onChange={e => handleInputChange('temporaryPassword', e.target.value)}
                    placeholder='Enter temporary password'
                    className='flex-1'
                  />
                  <Button
                    onClick={handleGeneratePassword}
                    variant='secondary'
                    size='sm'
                    type='button'
                  >
                    Generate
                  </Button>
                </div>
                <p className='text-xs text-gray-500 mt-1'>
                  Minimum 8 characters. User will be required to change this on first login.
                </p>
              </div>
            )}

            {generatedPassword && (
              <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md'>
                <label
                  htmlFor='generatedPasswordValue'
                  className='block text-sm font-medium text-blue-800 dark:text-blue-200 mb-1'
                >
                  Generated Password
                </label>
                <div className='flex items-center space-x-2'>
                  <code
                    id='generatedPasswordValue'
                    className='flex-1 px-2 py-1 bg-white dark:bg-gray-800 border rounded text-sm font-mono'
                  >
                    {generatedPassword}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(generatedPassword)}
                    variant='secondary'
                    size='sm'
                    type='button'
                  >
                    Copy
                  </Button>
                </div>
                <p className='text-xs text-blue-600 dark:text-blue-400 mt-1'>
                  ⚠️ Save this password securely. It won&apos;t be shown again.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Email Settings */}
        <div>
          <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
            Email Settings
          </h4>
          <div className='flex items-center'>
            <input
              type='checkbox'
              id='sendWelcomeEmail'
              checked={formData.sendWelcomeEmail}
              onChange={e => handleInputChange('sendWelcomeEmail', e.target.checked)}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
            />
            <label
              htmlFor='sendWelcomeEmail'
              className='ml-2 block text-sm text-gray-900 dark:text-gray-100'
            >
              Send welcome email with login instructions
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <Button onClick={handleClose} variant='secondary' disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateUserModal
