import React, { forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'filled'
  size?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, variant = 'default', size = 'md', className, ...props }, ref) => {
    const baseClasses = [
      'block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm transition-all duration-200',
      'text-gray-900 dark:text-gray-100',
      'placeholder-gray-500 dark:placeholder-gray-400',
      'focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-50',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800',
    ]

    const variantClasses = {
      default: 'bg-white dark:bg-gray-800 border',
      filled: 'bg-gray-50 dark:bg-gray-700 border',
    }

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    const errorClasses = error
      ? 'border-red-400 dark:border-red-500 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
      : ''

    return (
      <div className='space-y-1'>
        {label && (
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            baseClasses,
            variantClasses[variant],
            sizeClasses[size],
            errorClasses,
            className
          )}
          {...props}
        />
        {error && (
          <p className='text-sm text-red-600 dark:text-red-400 mt-1' role='alert'>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
