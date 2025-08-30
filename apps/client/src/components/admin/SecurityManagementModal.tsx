import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Input, Loading } from '@trading-viewer/ui'
import { useError } from '../../contexts/ErrorContext'
import { apiService } from '../../services/base/ApiService'

interface SecurityManagementModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  ipRestrictions: IPRestriction[]
  trustedDevices: TrustedDevice[]
  securityNotifications: SecurityNotificationSettings
}

interface IPRestriction {
  id: string
  ipAddress: string
  subnet?: string
  description: string
  isActive: boolean
  createdAt: string
  lastUsed?: string
}

interface TrustedDevice {
  id: string
  deviceName: string
  userAgent: string
  ipAddress: string
  lastUsed: string
  isActive: boolean
  createdAt: string
}

interface SecurityNotificationSettings {
  loginFromNewDevice: boolean
  loginFromNewLocation: boolean
  failedLoginAttempts: boolean
  passwordChanged: boolean
  twoFactorDisabled: boolean
}

const SecurityManagementModal: React.FC<SecurityManagementModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'2fa' | 'ip' | 'devices' | 'notifications'>('2fa')
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [newIPRestriction, setNewIPRestriction] = useState({
    ipAddress: '',
    subnet: '',
    description: '',
  })
  const { showError, showSuccess } = useError()

  const tabs = [
    { id: '2fa', label: 'Two-Factor Auth', icon: '🔐' },
    { id: 'ip', label: 'IP Restrictions', icon: '🌐' },
    { id: 'devices', label: 'Trusted Devices', icon: '📱' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ]
  const fetchSecuritySettings = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await apiService.get<{ success: boolean; data: SecuritySettings }>(
        `/auth/users/${userId}/security`
      )

      if (response.success) {
        setSecuritySettings(response.data)
      }
    } catch {
      console.error('Failed to fetch security settings:', error)
      showError('Failed to load security settings')
    } finally {
      setLoading(false)
    }
  }, [showError, userId])

  useEffect(() => {
    if (isOpen && userId) {
      fetchSecuritySettings()
    }
  }, [isOpen, userId, fetchSecuritySettings])

  const handleToggle2FA = async () => {
    if (!userId || !securitySettings) return

    const newStatus = !securitySettings.twoFactorEnabled
    const confirmMessage = newStatus
      ? 'Are you sure you want to enable two-factor authentication for this user?'
      : 'Are you sure you want to disable two-factor authentication for this user? This will reduce account security.'

    if (!window.confirm(confirmMessage)) return

    try {
      setActionLoading('2fa')
      await apiService.post(`/auth/users/${userId}/2fa/${newStatus ? 'enable' : 'disable'}`)

      setSecuritySettings(prev =>
        prev
          ? {
              ...prev,
              twoFactorEnabled: newStatus,
            }
          : null
      )

      showSuccess(`Two-factor authentication ${newStatus ? 'enabled' : 'disabled'} successfully`)
    } catch {
      console.error('Failed to toggle 2FA:', error)
      showError(`Failed to ${newStatus ? 'enable' : 'disable'} two-factor authentication`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddIPRestriction = async () => {
    if (!userId || !newIPRestriction.ipAddress.trim()) {
      showError('IP address is required')
      return
    }

    try {
      setActionLoading('add-ip')
      const response = await apiService.post<{ success: boolean; data: IPRestriction }>(
        `/auth/users/${userId}/ip-restrictions`,
        newIPRestriction
      )

      if (response.success) {
        setSecuritySettings(prev =>
          prev
            ? {
                ...prev,
                ipRestrictions: [...prev.ipRestrictions, response.data],
              }
            : null
        )

        setNewIPRestriction({ ipAddress: '', subnet: '', description: '' })
        showSuccess('IP restriction added successfully')
      }
    } catch {
      console.error('Failed to add IP restriction:', error)
      showError('Failed to add IP restriction')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleIPRestriction = async (restrictionId: string, isActive: boolean) => {
    try {
      setActionLoading(`ip-${restrictionId}`)
      await apiService.put(`/auth/users/${userId}/ip-restrictions/${restrictionId}`, {
        isActive: !isActive,
      })

      setSecuritySettings(prev =>
        prev
          ? {
              ...prev,
              ipRestrictions: prev.ipRestrictions.map(restriction =>
                restriction.id === restrictionId
                  ? { ...restriction, isActive: !isActive }
                  : restriction
              ),
            }
          : null
      )

      showSuccess(`IP restriction ${!isActive ? 'enabled' : 'disabled'}`)
    } catch {
      console.error('Failed to toggle IP restriction:', error)
      showError('Failed to update IP restriction')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveIPRestriction = async (restrictionId: string) => {
    if (!window.confirm('Are you sure you want to remove this IP restriction?')) return

    try {
      setActionLoading(`remove-ip-${restrictionId}`)
      await apiService.delete(`/auth/users/${userId}/ip-restrictions/${restrictionId}`)

      setSecuritySettings(prev =>
        prev
          ? {
              ...prev,
              ipRestrictions: prev.ipRestrictions.filter(
                restriction => restriction.id !== restrictionId
              ),
            }
          : null
      )

      showSuccess('IP restriction removed successfully')
    } catch {
      console.error('Failed to remove IP restriction:', error)
      showError('Failed to remove IP restriction')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeTrustedDevice = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to revoke this trusted device?')) return

    try {
      setActionLoading(`device-${deviceId}`)
      await apiService.delete(`/auth/users/${userId}/trusted-devices/${deviceId}`)

      setSecuritySettings(prev =>
        prev
          ? {
              ...prev,
              trustedDevices: prev.trustedDevices.filter(device => device.id !== deviceId),
            }
          : null
      )

      showSuccess('Trusted device revoked successfully')
    } catch {
      console.error('Failed to revoke trusted device:', error)
      showError('Failed to revoke trusted device')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateNotificationSettings = async (
    setting: keyof SecurityNotificationSettings,
    value: boolean
  ) => {
    try {
      setActionLoading('notifications')
      await apiService.put(`/auth/users/${userId}/security/notifications`, {
        [setting]: value,
      })

      setSecuritySettings(prev =>
        prev
          ? {
              ...prev,
              securityNotifications: {
                ...prev.securityNotifications,
                [setting]: value,
              },
            }
          : null
      )

      showSuccess('Notification settings updated')
    } catch {
      console.error('Failed to update notification settings:', error)
      showError('Failed to update notification settings')
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

  const render2FATab = () => (
    <div className='space-y-6'>
      <div className='flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg'>
        <div>
          <h4 className='text-md font-medium text-gray-900 dark:text-white'>
            Two-Factor Authentication
          </h4>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            {securitySettings?.twoFactorEnabled
              ? 'Two-factor authentication is currently enabled for this user.'
              : 'Two-factor authentication is currently disabled for this user.'}
          </p>
        </div>
        <div className='flex items-center space-x-3'>
          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              securitySettings?.twoFactorEnabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {securitySettings?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <Button
            onClick={handleToggle2FA}
            disabled={actionLoading === '2fa'}
            variant={securitySettings?.twoFactorEnabled ? 'secondary' : 'primary'}
            size='sm'
          >
            {actionLoading === '2fa'
              ? 'Processing...'
              : securitySettings?.twoFactorEnabled
                ? 'Disable'
                : 'Enable'}
          </Button>
        </div>
      </div>

      {securitySettings?.twoFactorEnabled && (
        <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
          <h5 className='text-sm font-medium text-blue-800 dark:text-blue-200 mb-2'>
            Security Notice
          </h5>
          <p className='text-sm text-blue-700 dark:text-blue-300'>
            Two-factor authentication provides an additional layer of security. Users will need to
            provide both their password and a verification code from their authenticator app to log
            in.
          </p>
        </div>
      )}
    </div>
  )

  const renderIPTab = () => (
    <div className='space-y-6'>
      {/* Add New IP Restriction */}
      <div className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg'>
        <h4 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
          Add IP Restriction
        </h4>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <Input
            value={newIPRestriction.ipAddress}
            onChange={e => setNewIPRestriction(prev => ({ ...prev, ipAddress: e.target.value }))}
            placeholder='192.168.1.1'
            label='IP Address'
          />
          <Input
            value={newIPRestriction.subnet}
            onChange={e => setNewIPRestriction(prev => ({ ...prev, subnet: e.target.value }))}
            placeholder='/24 (optional)'
            label='Subnet'
          />
          <Input
            value={newIPRestriction.description}
            onChange={e => setNewIPRestriction(prev => ({ ...prev, description: e.target.value }))}
            placeholder='Office network'
            label='Description'
          />
        </div>
        <div className='mt-3'>
          <Button
            onClick={handleAddIPRestriction}
            disabled={actionLoading === 'add-ip' || !newIPRestriction.ipAddress.trim()}
            size='sm'
          >
            {actionLoading === 'add-ip' ? 'Adding...' : 'Add Restriction'}
          </Button>
        </div>
      </div>

      {/* IP Restrictions List */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
          Current IP Restrictions ({securitySettings?.ipRestrictions.length || 0})
        </h4>
        {securitySettings?.ipRestrictions.length === 0 ? (
          <p className='text-center text-gray-500 py-8'>No IP restrictions configured</p>
        ) : (
          <div className='space-y-3'>
            {securitySettings?.ipRestrictions.map(restriction => (
              <div
                key={restriction.id}
                className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2'>
                      <code className='text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded'>
                        {restriction.ipAddress}
                        {restriction.subnet || ''}
                      </code>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          restriction.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {restriction.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      {restriction.description || 'No description'}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                      Created: {formatDate(restriction.createdAt)}
                      {restriction.lastUsed && ` • Last used: ${formatDate(restriction.lastUsed)}`}
                    </p>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Button
                      onClick={() =>
                        handleToggleIPRestriction(restriction.id, restriction.isActive)
                      }
                      disabled={actionLoading === `ip-${restriction.id}`}
                      variant='secondary'
                      size='sm'
                    >
                      {actionLoading === `ip-${restriction.id}`
                        ? 'Processing...'
                        : restriction.isActive
                          ? 'Disable'
                          : 'Enable'}
                    </Button>
                    <Button
                      onClick={() => handleRemoveIPRestriction(restriction.id)}
                      disabled={actionLoading === `remove-ip-${restriction.id}`}
                      variant='secondary'
                      size='sm'
                      className='bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                    >
                      {actionLoading === `remove-ip-${restriction.id}` ? 'Removing...' : 'Remove'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderDevicesTab = () => (
    <div className='space-y-6'>
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
          Trusted Devices ({securitySettings?.trustedDevices.length || 0})
        </h4>
        {securitySettings?.trustedDevices.length === 0 ? (
          <p className='text-center text-gray-500 py-8'>No trusted devices found</p>
        ) : (
          <div className='space-y-3'>
            {securitySettings?.trustedDevices.map(device => (
              <div
                key={device.id}
                className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2'>
                      <h5 className='text-sm font-medium text-gray-900 dark:text-white'>
                        {device.deviceName || 'Unknown Device'}
                      </h5>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          device.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {device.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </div>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      IP: {device.ipAddress}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                      {device.userAgent.substring(0, 80)}
                      {device.userAgent.length > 80 ? '...' : ''}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                      Added: {formatDate(device.createdAt)} • Last used:{' '}
                      {formatDate(device.lastUsed)}
                    </p>
                  </div>
                  {device.isActive && (
                    <Button
                      onClick={() => handleRevokeTrustedDevice(device.id)}
                      disabled={actionLoading === `device-${device.id}`}
                      variant='secondary'
                      size='sm'
                      className='bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                    >
                      {actionLoading === `device-${device.id}` ? 'Revoking...' : 'Revoke'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderNotificationsTab = () => (
    <div className='space-y-6'>
      <h4 className='text-md font-medium text-gray-900 dark:text-white'>
        Security Notification Settings
      </h4>

      <div className='space-y-4'>
        {Object.entries({
          loginFromNewDevice: 'Login from new device',
          loginFromNewLocation: 'Login from new location',
          failedLoginAttempts: 'Failed login attempts',
          passwordChanged: 'Password changed',
          twoFactorDisabled: 'Two-factor authentication disabled',
        }).map(([key, label]) => (
          <div
            key={key}
            className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg'
          >
            <label htmlFor={key} className='flex-grow cursor-pointer'>
              <span className='text-sm font-medium text-gray-900 dark:text-white'>{label}</span>
              <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                Send email notifications when this security event occurs
              </p>
            </label>
            <div className='relative inline-flex items-center cursor-pointer'>
              <input
                id={key}
                type='checkbox'
                checked={
                  securitySettings?.securityNotifications[
                    key as keyof SecurityNotificationSettings
                  ] || false
                }
                onChange={e =>
                  handleUpdateNotificationSettings(
                    key as keyof SecurityNotificationSettings,
                    e.target.checked
                  )
                }
                disabled={actionLoading === 'notifications'}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Security Management'>
      <div className='max-w-4xl'>
        {/* Tabs */}
        <div className='border-b border-gray-200 dark:border-gray-700 mb-6'>
          <nav className='-mb-px flex space-x-8'>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as '2fa' | 'ip' | 'devices' | 'notifications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className='max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loading />
              <span className='ml-2'>Loading security settings...</span>
            </div>
          ) : (
            <div>
              {activeTab === '2fa' && render2FATab()}
              {activeTab === 'ip' && renderIPTab()}
              {activeTab === 'devices' && renderDevicesTab()}
              {activeTab === 'notifications' && renderNotificationsTab()}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default SecurityManagementModal
