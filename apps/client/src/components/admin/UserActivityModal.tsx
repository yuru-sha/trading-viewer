import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Loading } from '@trading-viewer/ui'
import { useError } from '../../contexts/ErrorContext'
import { apiService } from '../../services/base/ApiService'

interface LoginHistory {
  id: string
  userId: string
  ipAddress: string
  userAgent: string
  location?: string
  loginAt: string
  logoutAt?: string
  isSuccessful: boolean
  failureReason?: string
  sessionId?: string
  deviceInfo?: {
    browser: string
    os: string
    device: string
  }
}

interface ActiveSession {
  id: string
  userId: string
  ipAddress: string
  userAgent: string
  lastActivity: string
  createdAt: string
  expiresAt: string
  deviceInfo?: {
    browser: string
    os: string
    device: string
  }
}

interface SecurityEvent {
  id: string
  userId: string
  eventType:
    | 'login_failure'
    | 'password_change'
    | 'email_change'
    | 'account_locked'
    | 'suspicious_activity'
  description: string
  ipAddress: string
  userAgent: string
  createdAt: string
  severity: 'low' | 'medium' | 'high'
}

interface UserActivityModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

const UserActivityModal: React.FC<UserActivityModalProps> = ({ isOpen, onClose, userId }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'sessions' | 'security'>('history')
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { showError, showSuccess } = useError()

  const tabs = [
    { id: 'history', label: 'Login History', count: loginHistory.length },
    { id: 'sessions', label: 'Active Sessions', count: activeSessions.length },
    { id: 'security', label: 'Security Events', count: securityEvents.length },
  ]

  const fetchLoginHistory = useCallback(async () => {
    if (!userId) return
    const response = await apiService.get<{ success: boolean; data: LoginHistory[] }>(
      `/auth/users/${userId}/login-history?limit=50`
    )
    if (response.success) {
      setLoginHistory(response.data)
    }
  }, [userId])

  const fetchActiveSessions = useCallback(async () => {
    if (!userId) return
    const response = await apiService.get<{ success: boolean; data: ActiveSession[] }>(
      `/auth/users/${userId}/sessions`
    )
    if (response.success) {
      setActiveSessions(response.data)
    }
  }, [userId])

  const fetchSecurityEvents = useCallback(async () => {
    if (!userId) return
    const response = await apiService.get<{ success: boolean; data: SecurityEvent[] }>(
      `/auth/users/${userId}/security-events?limit=50`
    )
    if (response.success) {
      setSecurityEvents(response.data)
    }
  }, [userId])

  const fetchData = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)

      switch (activeTab) {
        case 'history':
          await fetchLoginHistory()
          break
        case 'sessions':
          await fetchActiveSessions()
          break
        case 'security':
          await fetchSecurityEvents()
          break
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      showError('Failed to load user activity data')
    } finally {
      setLoading(false)
    }
  }, [activeTab, fetchActiveSessions, fetchLoginHistory, fetchSecurityEvents, showError, userId])

  useEffect(() => {
    if (isOpen && userId) {
      fetchData()
    }
  }, [isOpen, userId, activeTab, fetchData])

  const handleTerminateSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) {
      return
    }

    try {
      setActionLoading(sessionId)
      await apiService.delete(`/auth/sessions/${sessionId}`)
      showSuccess('Session terminated successfully')
      fetchActiveSessions()
    } catch (error) {
      console.error('Failed to terminate session:', error)
      showError('Failed to terminate session')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTerminateAllSessions = async () => {
    if (!window.confirm('Are you sure you want to terminate all sessions for this user?')) {
      return
    }

    try {
      setActionLoading('all')
      await apiService.delete(`/auth/users/${userId}/sessions`)
      showSuccess('All sessions terminated successfully')
      fetchActiveSessions()
    } catch (error) {
      console.error('Failed to terminate all sessions:', error)
      showError('Failed to terminate all sessions')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getLocationDisplay = (ipAddress: string, location?: string) => {
    if (location) {
      return location
    }
    return ipAddress
  }

  const getDeviceInfo = (
    userAgent: string,
    deviceInfo?: { browser: string; os: string; device: string }
  ) => {
    if (deviceInfo) {
      return `${deviceInfo.browser} on ${deviceInfo.os}`
    }
    return userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : '')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const renderLoginHistory = () => (
    <div className='space-y-4'>
      {loginHistory.length === 0 ? (
        <p className='text-center text-gray-500 py-8'>No login history found</p>
      ) : (
        <div className='space-y-3'>
          {loginHistory.map(entry => (
            <div
              key={entry.id}
              className={`p-4 rounded-lg border ${
                entry.isSuccessful
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center space-x-2'>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.isSuccessful
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {entry.isSuccessful ? 'Success' : 'Failed'}
                    </span>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {formatDate(entry.loginAt)}
                    </span>
                  </div>
                  <div className='mt-2 text-sm text-gray-800 dark:text-gray-200'>
                    <p>
                      <strong>Location:</strong>{' '}
                      {getLocationDisplay(entry.ipAddress, entry.location)}
                    </p>
                    <p>
                      <strong>Device:</strong> {getDeviceInfo(entry.userAgent, entry.deviceInfo)}
                    </p>
                    {!entry.isSuccessful && entry.failureReason && (
                      <p className='text-red-600 dark:text-red-400'>
                        <strong>Reason:</strong> {entry.failureReason}
                      </p>
                    )}
                    {entry.logoutAt && (
                      <p>
                        <strong>Logout:</strong> {formatDate(entry.logoutAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderActiveSessions = () => (
    <div className='space-y-4'>
      {activeSessions.length > 0 && (
        <div className='flex justify-end'>
          <Button
            onClick={handleTerminateAllSessions}
            disabled={actionLoading === 'all'}
            variant='secondary'
            size='sm'
            className='bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
          >
            {actionLoading === 'all' ? 'Terminating...' : 'Terminate All Sessions'}
          </Button>
        </div>
      )}

      {activeSessions.length === 0 ? (
        <p className='text-center text-gray-500 py-8'>No active sessions found</p>
      ) : (
        <div className='space-y-3'>
          {activeSessions.map(session => (
            <div
              key={session.id}
              className='p-4 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center space-x-2 mb-2'>
                    <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                      Active
                    </span>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Created: {formatDate(session.createdAt)}
                    </span>
                  </div>
                  <div className='text-sm text-gray-800 dark:text-gray-200 space-y-1'>
                    <p>
                      <strong>IP Address:</strong> {session.ipAddress}
                    </p>
                    <p>
                      <strong>Device:</strong>{' '}
                      {getDeviceInfo(session.userAgent, session.deviceInfo)}
                    </p>
                    <p>
                      <strong>Last Activity:</strong> {formatDate(session.lastActivity)}
                    </p>
                    <p>
                      <strong>Expires:</strong> {formatDate(session.expiresAt)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleTerminateSession(session.id)}
                  disabled={actionLoading === session.id}
                  variant='secondary'
                  size='sm'
                  className='bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                >
                  {actionLoading === session.id ? 'Terminating...' : 'Terminate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSecurityEvents = () => (
    <div className='space-y-4'>
      {securityEvents.length === 0 ? (
        <p className='text-center text-gray-500 py-8'>No security events found</p>
      ) : (
        <div className='space-y-3'>
          {securityEvents.map(event => (
            <div
              key={event.id}
              className='p-4 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center space-x-2 mb-2'>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}
                    >
                      {event.severity.toUpperCase()}
                    </span>
                    <span className='text-sm font-medium text-gray-800 dark:text-gray-200'>
                      {event.eventType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                  <div className='text-sm text-gray-800 dark:text-gray-200 space-y-1'>
                    <p>{event.description}</p>
                    <p>
                      <strong>IP Address:</strong> {event.ipAddress}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      User Agent: {event.userAgent.substring(0, 100)}
                      {event.userAgent.length > 100 ? '...' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='User Activity & Security'>
      <div className='max-w-4xl'>
        {/* Tabs */}
        <div className='border-b border-gray-200 dark:border-gray-700 mb-6'>
          <nav className='-mb-px flex space-x-8'>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'history' | 'sessions' | 'security')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className='ml-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs'>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className='max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loading />
              <span className='ml-2'>Loading {activeTab}...</span>
            </div>
          ) : (
            <div>
              {activeTab === 'history' && renderLoginHistory()}
              {activeTab === 'sessions' && renderActiveSessions()}
              {activeTab === 'security' && renderSecurityEvents()}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default UserActivityModal
