import React from 'react'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  error?: string | null
  className?: string
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  error,
  className = '',
}) => {
  if (isConnecting) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className='w-2 h-2 rounded-full bg-yellow-500 animate-pulse'></div>
        <span className='text-sm text-yellow-600 dark:text-yellow-400'>Connecting...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className='w-2 h-2 rounded-full bg-red-500'></div>
        <span className='text-sm text-red-600 dark:text-red-400'>Connection Error</span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse'></div>
        <span className='text-sm text-green-600 dark:text-green-400'>Live Data</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className='w-2 h-2 rounded-full bg-gray-400'></div>
      <span className='text-sm text-gray-600 dark:text-gray-400'>Disconnected</span>
    </div>
  )
}

export default ConnectionStatus
