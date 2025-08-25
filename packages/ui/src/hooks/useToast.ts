import { useCallback, useState } from 'react'
import type { ToastProps } from '../components/Toast'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  duration?: number
  message?: string
}

interface Toast extends Omit<ToastProps, 'onClose'> {
  onClose?: (id: string) => void
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, title: string, options: ToastOptions = {}) => {
      const id = Math.random().toString(36).substr(2, 9)
      const toast: Toast = {
        id,
        type,
        title,
        onClose: removeToast,
        ...options,
      }

      setToasts(prev => [...prev, toast])
      return id
    },
    [removeToast]
  )

  const toast = {
    success: (title: string, options?: ToastOptions) => addToast('success', title, options),
    error: (title: string, options?: ToastOptions) => addToast('error', title, options),
    warning: (title: string, options?: ToastOptions) => addToast('warning', title, options),
    info: (title: string, options?: ToastOptions) => addToast('info', title, options),
    remove: removeToast,
    clear: () => setToasts([]),
  }

  return {
    toasts: toasts.map(t => ({ ...t, onClose: removeToast })),
    toast,
  }
}
