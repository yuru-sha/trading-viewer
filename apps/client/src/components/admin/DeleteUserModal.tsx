import React, { useState } from 'react'
import { Modal, Button } from '@trading-viewer/ui'
import { useError } from '../../contexts/ErrorContext'
import { apiService } from '../../services/base/ApiService'

interface DeleteUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    isActive: boolean
  } | null
  onUserDeleted: () => void
}

interface DeleteConfirmation {
  email: string
  deleteType: 'soft' | 'hard'
  reason?: string
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserDeleted,
}) => {
  const [deleteData, setDeleteData] = useState<DeleteConfirmation>({
    email: '',
    deleteType: 'soft',
    reason: '',
  })
  const [deleting, setDeleting] = useState(false)
  const [confirmationStep, setConfirmationStep] = useState(1)
  const { showError, showSuccess } = useError()

  const deleteReasons = [
    'User request',
    'Account violation',
    'Duplicate account',
    'Inactive user cleanup',
    'Security concern',
    'GDPR compliance',
    'Other',
  ]

  const handleDeleteTypeChange = (type: 'soft' | 'hard') => {
    setDeleteData(prev => ({ ...prev, deleteType: type }))
  }

  const handleEmailChange = (email: string) => {
    setDeleteData(prev => ({ ...prev, email }))
  }

  const handleReasonChange = (reason: string) => {
    setDeleteData(prev => ({ ...prev, reason }))
  }

  const isEmailValid = () => {
    return user && deleteData.email === user.email
  }

  const canProceedToConfirmation = () => {
    return isEmailValid() && deleteData.reason.trim() !== ''
  }

  const handleProceedToConfirmation = () => {
    if (canProceedToConfirmation()) {
      setConfirmationStep(2)
    }
  }

  const handleConfirmDelete = async () => {
    if (!user || !isEmailValid()) {
      showError('Email confirmation does not match')
      return
    }

    try {
      setDeleting(true)

      const endpoint =
        deleteData.deleteType === 'hard'
          ? `/auth/users/${user.id}/permanent`
          : `/auth/users/${user.id}`

      await apiService.delete(endpoint, {
        data: {
          reason: deleteData.reason,
          confirmEmail: deleteData.email,
        },
      })

      const deleteTypeText =
        deleteData.deleteType === 'hard' ? 'permanently deleted' : 'deactivated'
      showSuccess(`User ${deleteTypeText} successfully`)
      onUserDeleted()
      handleClose()
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      if (error.response?.data?.message) {
        showError(error.response.data.message)
      } else {
        showError('Failed to delete user')
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    setDeleteData({
      email: '',
      deleteType: 'soft',
      reason: '',
    })
    setConfirmationStep(1)
    onClose()
  }

  const getUserDisplayName = () => {
    if (!user) return ''
    return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email
  }

  const getSeverityColor = (type: 'soft' | 'hard') => {
    return type === 'hard'
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }

  const getDeleteDescription = (type: 'soft' | 'hard') => {
    if (type === 'hard') {
      return 'Permanently deletes the user and all associated data. This action cannot be undone.'
    }
    return 'Deactivates the user account. The user can be reactivated later if needed.'
  }

  if (!user) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Delete User: ${getUserDisplayName()}`}>
      <div className='max-w-lg'>
        {confirmationStep === 1 ? (
          <div className='space-y-6'>
            {/* Warning Message */}
            <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <svg className='h-5 w-5 text-yellow-400' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>
                    Warning: User Deletion
                  </h3>
                  <p className='mt-1 text-sm text-yellow-700 dark:text-yellow-300'>
                    You are about to delete user: <strong>{getUserDisplayName()}</strong> (
                    {user.email})
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Type Selection */}
            <div>
              <h4 className='text-md font-semibold text-gray-900 dark:text-white mb-3'>
                Deletion Type
              </h4>
              <div className='space-y-3'>
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    deleteData.deleteType === 'soft'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => handleDeleteTypeChange('soft')}
                >
                  <div className='flex items-start'>
                    <input
                      type='radio'
                      checked={deleteData.deleteType === 'soft'}
                      onChange={() => handleDeleteTypeChange('soft')}
                      className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300'
                    />
                    <div className='ml-3'>
                      <div className='flex items-center space-x-2'>
                        <h5 className='text-sm font-medium text-gray-900 dark:text-white'>
                          Soft Delete (Recommended)
                        </h5>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor('soft')}`}
                        >
                          Reversible
                        </span>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                        {getDeleteDescription('soft')}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    deleteData.deleteType === 'hard'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => handleDeleteTypeChange('hard')}
                >
                  <div className='flex items-start'>
                    <input
                      type='radio'
                      checked={deleteData.deleteType === 'hard'}
                      onChange={() => handleDeleteTypeChange('hard')}
                      className='mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300'
                    />
                    <div className='ml-3'>
                      <div className='flex items-center space-x-2'>
                        <h5 className='text-sm font-medium text-gray-900 dark:text-white'>
                          Hard Delete (Permanent)
                        </h5>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor('hard')}`}
                        >
                          Irreversible
                        </span>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                        {getDeleteDescription('hard')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deletion Reason */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Deletion Reason *
              </label>
              <select
                value={deleteData.reason}
                onChange={e => handleReasonChange(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                required
              >
                <option value=''>Select a reason</option>
                {deleteReasons.map(reason => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Confirmation */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Type user's email to confirm:{' '}
                <code className='text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded'>
                  {user.email}
                </code>
              </label>
              <input
                type='email'
                value={deleteData.email}
                onChange={e => handleEmailChange(e.target.value)}
                placeholder="Enter user's email address"
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                required
              />
              {deleteData.email && !isEmailValid() && (
                <p className='text-sm text-red-600 dark:text-red-400 mt-1'>Email does not match</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
              <Button onClick={handleClose} variant='secondary'>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToConfirmation}
                disabled={!canProceedToConfirmation()}
                className='bg-yellow-600 hover:bg-yellow-700 text-white'
              >
                Proceed to Confirmation
              </Button>
            </div>
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Final Confirmation */}
            <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <svg className='h-5 w-5 text-red-400' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>
                    Final Confirmation Required
                  </h3>
                  <p className='mt-1 text-sm text-red-700 dark:text-red-300'>
                    This action will{' '}
                    {deleteData.deleteType === 'hard' ? 'permanently delete' : 'deactivate'} the
                    user and cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className='bg-gray-50 dark:bg-gray-800 p-4 rounded-lg'>
              <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-3'>
                Deletion Summary
              </h4>
              <dl className='space-y-2'>
                <div className='flex justify-between'>
                  <dt className='text-sm text-gray-600 dark:text-gray-400'>User:</dt>
                  <dd className='text-sm font-medium text-gray-900 dark:text-white'>
                    {getUserDisplayName()} ({user.email})
                  </dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-gray-600 dark:text-gray-400'>Type:</dt>
                  <dd className='text-sm font-medium'>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(deleteData.deleteType)}`}
                    >
                      {deleteData.deleteType === 'hard' ? 'Hard Delete' : 'Soft Delete'}
                    </span>
                  </dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-gray-600 dark:text-gray-400'>Reason:</dt>
                  <dd className='text-sm font-medium text-gray-900 dark:text-white'>
                    {deleteData.reason}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Final Warning */}
            <div className='text-center'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Are you absolutely sure you want to proceed?
              </p>
              {deleteData.deleteType === 'hard' && (
                <p className='text-sm text-red-600 dark:text-red-400 font-medium mt-1'>
                  This will permanently delete all user data and cannot be recovered.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
              <Button
                onClick={() => setConfirmationStep(1)}
                variant='secondary'
                disabled={deleting}
              >
                Back
              </Button>
              <Button onClick={handleClose} variant='secondary' disabled={deleting}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className={`${
                  deleteData.deleteType === 'hard'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                } text-white`}
              >
                {deleting
                  ? 'Processing...'
                  : `Confirm ${deleteData.deleteType === 'hard' ? 'Permanent' : 'Soft'} Delete`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default DeleteUserModal
