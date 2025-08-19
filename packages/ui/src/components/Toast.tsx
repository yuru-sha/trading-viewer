import React, { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Icon } from './Icon'

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  onClose: (id: string) => void
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(id), 300) // アニメーション後に削除
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const typeConfig = {
    success: {
      icon: 'CheckCircle',
      bgColor: 'bg-green-50 dark:bg-green-900',
      iconColor: 'text-green-400',
      textColor: 'text-green-800 dark:text-green-200',
    },
    error: {
      icon: 'XCircle',
      bgColor: 'bg-red-50 dark:bg-red-900',
      iconColor: 'text-red-400',
      textColor: 'text-red-800 dark:text-red-200',
    },
    warning: {
      icon: 'AlertTriangle',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900',
      iconColor: 'text-yellow-400',
      textColor: 'text-yellow-800 dark:text-yellow-200',
    },
    info: {
      icon: 'Info',
      bgColor: 'bg-blue-50 dark:bg-blue-900',
      iconColor: 'text-blue-400',
      textColor: 'text-blue-800 dark:text-blue-200',
    },
  }

  const config = typeConfig[type]

  return (
    <div
      className={clsx(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300',
        config.bgColor,
        {
          'transform translate-y-0 opacity-100': isVisible,
          'transform translate-y-2 opacity-0': !isVisible,
        }
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon name={config.icon} className={clsx('h-6 w-6', config.iconColor)} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={clsx('text-sm font-medium', config.textColor)}>{title}</p>
            {message && (
              <p className={clsx('mt-1 text-sm', config.textColor, 'opacity-80')}>{message}</p>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className={clsx(
                'inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                config.textColor,
                'hover:opacity-75'
              )}
              onClick={() => {
                setIsVisible(false)
                setTimeout(() => onClose(id), 300)
              }}
            >
              <span className="sr-only">Close</span>
              <Icon name="X" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export interface ToastContainerProps {
  toasts: ToastProps[]
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'top-right',
}) => {
  const positionClasses = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
  }

  return (
    <div
      className={clsx(
        'fixed z-50 p-6 pointer-events-none',
        positionClasses[position]
      )}
    >
      <div className="space-y-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>
  )
}