import React from 'react'
import { Button } from '@trading-viewer/ui'
import Icon from '../Icon'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  icon?: string
  iconColor?: string
  details?: string[]
  isLoading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  icon,
  iconColor = 'text-red-500',
  details,
  isLoading = false,
}) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black bg-opacity-60 transition-opacity backdrop-blur-sm'
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Dialog */}
      <div className='flex items-center justify-center min-h-screen p-4'>
        <div className='relative bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-8 transform transition-all'>
          {/* Title */}
          <h3 className='text-xl font-semibold text-white mb-4'>{title}</h3>

          {/* Message */}
          <p className='text-gray-300 mb-8 leading-relaxed'>{message}</p>

          {/* Details */}
          {details && details.length > 0 && (
            <div className='bg-gray-700/50 rounded-lg p-3 mb-6 max-h-32 overflow-y-auto'>
              <ul className='text-sm text-gray-300 space-y-1'>
                {details.map((detail, index) => (
                  <li key={index} className='flex items-start'>
                    <span className='mr-2 text-gray-500'>•</span>
                    <span className='break-all'>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className='flex justify-end space-x-3'>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className='px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]'
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className='px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]'
            >
              {isLoading ? (
                <div className='flex items-center justify-center'>
                  <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
