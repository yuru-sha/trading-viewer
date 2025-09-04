import React, { useState } from 'react'
import { Button } from '@trading-viewer/ui'
import { useError } from '@/presentation/context/ErrorContext'
import { apiService } from '@/infrastructure/api/ApiService'
import { log } from '@/infrastructure/services/LoggerService'

interface BulkUserActionsProps {
  selectedUsers: string[]
  onClearSelection: () => void
  onRefresh: () => void
}

interface BulkActionResult {
  success: number
  failed: number
  errors: string[]
}

const BulkUserActions: React.FC<BulkUserActionsProps> = ({
  selectedUsers,
  onClearSelection,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<string | null>(null)
  const { showError, showSuccess } = useError()

  const handleBulkAction = async (action: string, data?: unknown) => {
    if (selectedUsers.length === 0) {
      showError('No users selected')
      return
    }

    const confirmMessage = getConfirmMessage(action, selectedUsers.length)
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      setLoading(true)
      setActionType(action)

      const response = await apiService.post<{ success: boolean; data: BulkActionResult }>(
        '/auth/users/bulk',
        {
          action,
          userIds: selectedUsers,
          ...data,
        }
      )

      if (response.success) {
        const result = response.data
        if (result.failed > 0) {
          showError(
            `Action completed with ${result.success} successes and ${result.failed} failures. ${result.errors.join(', ')}`
          )
        } else {
          showSuccess(`Successfully ${getActionPastTense(action)} ${result.success} users`)
        }
        onClearSelection()
        onRefresh()
      }
    } catch (error: unknown) {
      log.auth.error(`Failed to perform bulk ${action}`, error, {
        operation: 'bulk_user_action',
        action,
        userCount: selectedUsers.length,
      })
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
          : `Failed to ${action} users`
      showError(errorMessage)
    } finally {
      setLoading(false)
      setActionType(null)
    }
  }

  const handleExportUsers = async () => {
    if (selectedUsers.length === 0) {
      showError('No users selected')
      return
    }

    try {
      setLoading(true)
      setActionType('export')

      const response = await apiService.post(
        '/auth/users/export',
        {
          userIds: selectedUsers,
          format: 'json',
        },
        {
          responseType: 'blob',
        }
      )

      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showSuccess(`Exported ${selectedUsers.length} users to JSON`)
    } catch (error) {
      log.auth.error('Failed to export users', error, {
        operation: 'export_users',
        userCount: selectedUsers.length,
      })
      showError('Failed to export users')
    } finally {
      setLoading(false)
      setActionType(null)
    }
  }

  const getConfirmMessage = (action: string, count: number): string => {
    switch (action) {
      case 'activate':
        return `Are you sure you want to activate ${count} users?`
      case 'deactivate':
        return `Are you sure you want to deactivate ${count} users? They won't be able to log in.`
      case 'delete':
        return `Are you sure you want to delete ${count} users? This action cannot be undone.`
      case 'makeAdmin':
        return `Are you sure you want to make ${count} users administrators?`
      case 'makeUser':
        return `Are you sure you want to change ${count} users to regular user role?`
      case 'unlock':
        return `Are you sure you want to unlock ${count} users?`
      case 'resetPassword':
        return `Are you sure you want to reset passwords for ${count} users? They will receive email instructions.`
      case 'resendVerification':
        return `Are you sure you want to resend email verification to ${count} users?`
      default:
        return `Are you sure you want to perform this action on ${count} users?`
    }
  }

  const getActionPastTense = (action: string): string => {
    switch (action) {
      case 'activate':
        return 'activated'
      case 'deactivate':
        return 'deactivated'
      case 'delete':
        return 'deleted'
      case 'makeAdmin':
        return 'promoted to admin'
      case 'makeUser':
        return 'changed to user role'
      case 'unlock':
        return 'unlocked'
      case 'resetPassword':
        return 'sent password reset to'
      case 'resendVerification':
        return 'sent verification email to'
      default:
        return 'processed'
    }
  }

  const isLoading = (action: string) => loading && actionType === action

  if (selectedUsers.length === 0) {
    return null
  }

  return (
    <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <span className='text-sm font-medium text-blue-800 dark:text-blue-200'>
            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
          </span>
          <Button onClick={onClearSelection} variant='secondary' size='sm'>
            Clear Selection
          </Button>
        </div>

        <div className='flex items-center space-x-2'>
          {/* Status Actions */}
          <div className='flex items-center space-x-1'>
            <Button
              onClick={() => handleBulkAction('activate')}
              disabled={loading}
              variant='secondary'
              size='sm'
              className='bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
            >
              {isLoading('activate') ? 'Activating...' : 'Activate'}
            </Button>
            <Button
              onClick={() => handleBulkAction('deactivate')}
              disabled={loading}
              variant='secondary'
              size='sm'
              className='bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
            >
              {isLoading('deactivate') ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </div>

          {/* Role Actions */}
          <div className='flex items-center space-x-1'>
            <Button
              onClick={() => handleBulkAction('makeAdmin')}
              disabled={loading}
              variant='secondary'
              size='sm'
              className='bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200'
            >
              {isLoading('makeAdmin') ? 'Processing...' : 'Make Admin'}
            </Button>
            <Button
              onClick={() => handleBulkAction('makeUser')}
              disabled={loading}
              variant='secondary'
              size='sm'
              className='bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
            >
              {isLoading('makeUser') ? 'Processing...' : 'Make User'}
            </Button>
          </div>

          {/* Security Actions */}
          <div className='flex items-center space-x-1'>
            <Button
              onClick={() => handleBulkAction('unlock')}
              disabled={loading}
              variant='secondary'
              size='sm'
              className='bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
            >
              {isLoading('unlock') ? 'Unlocking...' : 'Unlock'}
            </Button>
            <Button
              onClick={() => handleBulkAction('resetPassword')}
              disabled={loading}
              variant='secondary'
              size='sm'
              className='bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200'
            >
              {isLoading('resetPassword') ? 'Sending...' : 'Reset Password'}
            </Button>
          </div>

          {/* Email Actions */}
          <Button
            onClick={() => handleBulkAction('resendVerification')}
            disabled={loading}
            variant='secondary'
            size='sm'
            className='bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200'
          >
            {isLoading('resendVerification') ? 'Sending...' : 'Resend Verification'}
          </Button>

          {/* Export Action */}
          <Button onClick={handleExportUsers} disabled={loading} variant='secondary' size='sm'>
            {isLoading('export') ? 'Exporting...' : 'Export JSON'}
          </Button>

          {/* Delete Action */}
          <Button
            onClick={() => handleBulkAction('delete')}
            disabled={loading}
            variant='secondary'
            size='sm'
            className='bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
          >
            {isLoading('delete') ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className='mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400'>
          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2'></div>
          Processing {actionType} action for {selectedUsers.length} users...
        </div>
      )}
    </div>
  )
}

export default BulkUserActions
