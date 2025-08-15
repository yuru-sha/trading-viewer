import React, { useState, useEffect } from 'react'
import Icon from '../Icon'
import { useAuth } from '../../contexts/AuthContext'

interface AlertNotification {
  id: string
  type: 'price_alert'
  title: string
  message: string
  timestamp: number
  read: boolean
  alertId?: string
}

interface AlertNotificationsProps {
  wsService?: any
}

const AlertNotifications: React.FC<AlertNotificationsProps> = ({ wsService }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Listen for WebSocket alert notifications
  useEffect(() => {
    if (!wsService || !user) return

    const handleAlertNotification = (data: any) => {
      if (data.type === 'alert_triggered') {
        const notification: AlertNotification = {
          id: `alert-${data.alertId}-${Date.now()}`,
          type: 'price_alert',
          title: 'Price Alert Triggered',
          message: `${data.symbol}: Price ${data.condition} $${data.targetPrice}`,
          timestamp: Date.now(),
          read: false,
          alertId: data.alertId,
        }

        // Add to notifications list
        setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10

        // Show browser notification
        if (Notification.permission === 'granted') {
          const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `alert-${data.alertId}`,
            requireInteraction: true,
          })

          browserNotification.onclick = () => {
            window.focus()
            setShowNotifications(true)
            browserNotification.close()
          }

          // Auto close after 10 seconds
          setTimeout(() => {
            browserNotification.close()
          }, 10000)
        }
      }
    }

    // Listen for WebSocket messages
    if (wsService.addEventListener) {
      wsService.addEventListener('message', handleAlertNotification)
    }

    return () => {
      if (wsService.removeEventListener) {
        wsService.removeEventListener('message', handleAlertNotification)
      }
    }
  }, [wsService, user])

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    )
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className='relative'>
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className='relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-md'
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Icon name='bell' className='w-6 h-6' />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className='absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'>
          <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className='max-h-96 overflow-y-auto'>
            {notifications.length === 0 ? (
              <div className='p-4 text-center text-gray-500 dark:text-gray-400'>
                <Icon name='bell' className='w-8 h-8 mx-auto mb-2 opacity-50' />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className='flex items-start'>
                      <div
                        className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 mr-3 ${
                          !notification.read ? 'bg-blue-500' : 'bg-transparent'
                        }`}
                      />

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between'>
                          <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                            {notification.title}
                          </p>
                          <Icon
                            name='trendingUp'
                            className='w-4 h-4 text-orange-500 flex-shrink-0 ml-2'
                          />
                        </div>

                        <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
                          {notification.message}
                        </p>

                        <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-b-lg'>
              <button
                className='w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium'
                onClick={() => {
                  setShowNotifications(false)
                  // Navigate to alerts page
                  window.location.href = '/alerts'
                }}
              >
                View All Alerts
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showNotifications && (
        <div className='fixed inset-0 z-40' onClick={() => setShowNotifications(false)} />
      )}
    </div>
  )
}

export default AlertNotifications
