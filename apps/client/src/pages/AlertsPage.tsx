import React, { useState, useEffect } from 'react'
import { Button } from '@trading-viewer/ui'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../lib/apiClient'
import CreateAlertModal from '../components/alerts/CreateAlertModal'
import { formatPrice } from '../utils/currency'

interface PriceAlert {
  id: string
  symbol: string
  condition: 'above' | 'below'
  targetPrice: number
  percentageChange?: number
  enabled: boolean
  currency?: string
  exchange?: string
  timezone?: string
  triggeredAt?: string
  createdAt: string
}

const AlertsPage: React.FC = () => {
  const { user, requestWithAuth } = useAuth()
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null)
  const [togglingAlertId, setTogglingAlertId] = useState<string | null>(null)
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [groupBySymbol, setGroupBySymbol] = useState(true)

  // Fetch alerts
  const fetchAlerts = async () => {
    if (!user) return

    try {
      setLoading(true)
      // Use AuthContext's requestWithAuth for automatic token refresh
      const response = await requestWithAuth('/api/alerts')
      const data = await response.json()
      setAlerts(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [user])

  // Toggle alert enabled state with improved UX
  const toggleAlert = async (alert: PriceAlert) => {
    const newEnabled = !alert.enabled
    setTogglingAlertId(alert.id)

    try {
      await requestWithAuth(`/api/alerts/${alert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })

      setAlerts(prev =>
        prev.map(a =>
          a.id === alert.id
            ? { ...a, enabled: newEnabled, triggeredAt: newEnabled ? undefined : a.triggeredAt }
            : a
        )
      )

      setError(null)
    } catch (err: any) {
      setError(
        err.message || `Failed to ${newEnabled ? 'enable' : 'disable'} alert for ${alert.symbol}`
      )
    } finally {
      setTogglingAlertId(null)
    }
  }

  // Delete alert with improved UX
  const deleteAlert = async (alert: PriceAlert) => {
    const confirmMessage = `Are you sure you want to delete the alert for ${alert.symbol}?\n\nCondition: Price ${alert.condition} ${alert.targetPrice ? `$${alert.targetPrice}` : `${alert.percentageChange}%`}`

    if (!confirm(confirmMessage)) return

    setDeletingAlertId(alert.id)
    try {
      await requestWithAuth(`/api/alerts/${alert.id}`, {
        method: 'DELETE',
      })
      setAlerts(prev => prev.filter(a => a.id !== alert.id))
      // Show success message briefly
      const successMsg = `Alert for ${alert.symbol} deleted successfully`
      setError(null)
      // You could add a success toast here instead
    } catch (err: any) {
      setError(err.message || `Failed to delete alert for ${alert.symbol}`)
    } finally {
      setDeletingAlertId(null)
    }
  }

  // Edit alert
  const editAlert = (alert: PriceAlert) => {
    setEditingAlert(alert)
    setShowCreateModal(true)
  }

  // Handle modal close
  const handleModalClose = () => {
    setShowCreateModal(false)
    setEditingAlert(null)
  }

  // Toggle alert selection
  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(alertId)) {
        newSet.delete(alertId)
      } else {
        newSet.add(alertId)
      }
      return newSet
    })
  }

  // Select all alerts
  const selectAllAlerts = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set())
    } else {
      setSelectedAlerts(new Set(alerts.map(alert => alert.id)))
    }
  }

  // Bulk delete selected alerts
  const bulkDeleteAlerts = async () => {
    if (selectedAlerts.size === 0) return

    const selectedAlertsData = alerts.filter(alert => selectedAlerts.has(alert.id))
    const confirmMessage = `Are you sure you want to delete ${selectedAlerts.size} alert(s)?\n\n${selectedAlertsData.map(alert => `• ${alert.symbol} - ${alert.condition} ${alert.targetPrice ? `$${alert.targetPrice}` : `${alert.percentageChange}%`}`).join('\n')}`

    if (!confirm(confirmMessage)) return

    setBulkDeleting(true)
    const failedDeletes: string[] = []

    try {
      // Delete alerts in parallel
      const deletePromises = Array.from(selectedAlerts).map(async alertId => {
        try {
          await requestWithAuth(`/api/alerts/${alertId}`, {
            method: 'DELETE',
          })
          return { success: true, alertId }
        } catch (err) {
          failedDeletes.push(alertId)
          return { success: false, alertId }
        }
      })

      await Promise.all(deletePromises)

      // Remove successfully deleted alerts
      setAlerts(prev =>
        prev.filter(alert => !selectedAlerts.has(alert.id) || failedDeletes.includes(alert.id))
      )
      setSelectedAlerts(new Set())

      if (failedDeletes.length > 0) {
        setError(`Failed to delete ${failedDeletes.length} alert(s). Please try again.`)
      } else {
        setError(null)
      }
    } catch (err: any) {
      setError('Failed to delete selected alerts')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Group alerts by symbol
  const groupedAlerts = groupBySymbol
    ? alerts.reduce(
        (groups, alert) => {
          const symbol = alert.symbol
          if (!groups[symbol]) {
            groups[symbol] = []
          }
          groups[symbol].push(alert)
          return groups
        },
        {} as Record<string, PriceAlert[]>
      )
    : { 'All Alerts': alerts }

  const AlertCard: React.FC<{ alert: PriceAlert }> = ({ alert }) => (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 transition-colors ${
        selectedAlerts.has(alert.id)
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          <input
            type='checkbox'
            checked={selectedAlerts.has(alert.id)}
            onChange={() => toggleAlertSelection(alert.id)}
            className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500'
          />
          <div
            className={`w-3 h-3 rounded-full ${alert.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{alert.symbol}</h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              alert.triggeredAt
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : alert.enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {alert.triggeredAt ? 'Triggered' : alert.enabled ? 'Active' : 'Disabled'}
          </span>
        </div>

        <div className='flex items-center space-x-2'>
          <button
            onClick={() => editAlert(alert)}
            className='p-1 text-gray-400 hover:text-blue-500'
            title='Edit alert'
          >
            <Icon name='edit' className='w-4 h-4' />
          </button>
          <button
            onClick={() => toggleAlert(alert)}
            disabled={togglingAlertId === alert.id}
            className={`p-1 ${
              togglingAlertId === alert.id
                ? 'text-gray-300 cursor-not-allowed'
                : alert.enabled
                  ? 'text-green-500 hover:text-green-600'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title={
              togglingAlertId === alert.id
                ? 'Updating...'
                : alert.enabled
                  ? 'Disable alert'
                  : 'Enable alert'
            }
          >
            {togglingAlertId === alert.id ? (
              <div className='animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500' />
            ) : (
              <Icon name={alert.enabled ? 'pause' : 'play'} className='w-4 h-4' />
            )}
          </button>
          <button
            onClick={() => deleteAlert(alert)}
            disabled={deletingAlertId === alert.id}
            className={`p-1 ${
              deletingAlertId === alert.id
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:text-red-500'
            }`}
            title={deletingAlertId === alert.id ? 'Deleting...' : 'Delete alert'}
          >
            {deletingAlertId === alert.id ? (
              <div className='animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-red-500' />
            ) : (
              <Icon name='trash' className='w-4 h-4' />
            )}
          </button>
        </div>
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>Condition:</span>
          <span className='text-gray-900 dark:text-white font-medium'>
            {alert.targetPrice
              ? `Price ${alert.condition} ${formatPrice(alert.targetPrice, alert.currency)}`
              : `${alert.percentageChange && alert.percentageChange > 0 ? '+' : ''}${alert.percentageChange}% change`}
          </span>
        </div>

        {alert.percentageChange && alert.targetPrice && (
          <div className='flex items-center justify-between text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Change Trigger:</span>
            <span className='text-gray-900 dark:text-white font-medium'>
              {alert.percentageChange > 0 ? '+' : ''}
              {alert.percentageChange}%
            </span>
          </div>
        )}

        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>Created:</span>
          <span className='text-gray-900 dark:text-white'>
            {new Date(alert.createdAt).toLocaleDateString()}
          </span>
        </div>

        {alert.currency && alert.currency !== 'USD' && (
          <div className='flex items-center justify-between text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Currency:</span>
            <span className='text-gray-900 dark:text-white'>{alert.currency}</span>
          </div>
        )}

        {alert.triggeredAt && (
          <div className='flex items-center justify-between text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Triggered:</span>
            <span className='text-red-600 dark:text-red-400 font-medium'>
              {new Date(alert.triggeredAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  if (!user) {
    return (
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='text-center'>
          <Icon name='lock' className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
            Authentication Required
          </h2>
          <p className='text-gray-600 dark:text-gray-400'>
            Please log in to manage your price alerts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      {/* Header */}
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Price Alerts</h1>
          <p className='mt-2 text-gray-600 dark:text-gray-400'>
            Get notified when your symbols reach target prices
          </p>
        </div>

        <div className='flex items-center space-x-3'>
          {selectedAlerts.size > 0 && (
            <Button
              variant='outline'
              onClick={bulkDeleteAlerts}
              disabled={bulkDeleting}
              className='flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50'
            >
              {bulkDeleting ? (
                <div className='animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent' />
              ) : (
                <Icon name='trash' className='w-4 h-4' />
              )}
              <span>{bulkDeleting ? 'Deleting...' : `Delete ${selectedAlerts.size} Selected`}</span>
            </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)} className='flex items-center space-x-2'>
            <Icon name='add' className='w-4 h-4' />
            <span>Create Alert</span>
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className='mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
          <div className='flex items-center'>
            <Icon name='alertTriangle' className='w-5 h-5 text-red-500 mr-3' />
            <p className='text-red-700 dark:text-red-300'>{error}</p>
            <button
              onClick={() => setError(null)}
              className='ml-auto text-red-500 hover:text-red-700'
            >
              <Icon name='x' className='w-4 h-4' />
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {alerts.length > 0 && (
        <div className='mb-8 grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>Total Alerts</div>
            <div className='text-2xl font-bold text-gray-900 dark:text-white'>{alerts.length}</div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>Active</div>
            <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
              {alerts.filter(a => a.enabled && !a.triggeredAt).length}
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>Triggered</div>
            <div className='text-2xl font-bold text-red-600 dark:text-red-400'>
              {alerts.filter(a => a.triggeredAt).length}
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>Disabled</div>
            <div className='text-2xl font-bold text-gray-600 dark:text-gray-400'>
              {alerts.filter(a => !a.enabled && !a.triggeredAt).length}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className='text-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Loading your alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        /* Empty State */
        <div className='text-center py-12'>
          <Icon name='bell' className='w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>No alerts yet</h3>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            Create your first price alert to get notified when symbols reach your target prices.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Icon name='add' className='w-4 h-4 mr-2' />
            Create Your First Alert
          </Button>
        </div>
      ) : (
        /* Alerts Display */
        <div className='space-y-6'>
          {/* Bulk Actions Bar */}
          <div className='flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3'>
            <div className='flex items-center space-x-4'>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={selectedAlerts.size === alerts.length && alerts.length > 0}
                  onChange={selectAllAlerts}
                  className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500'
                />
                <span className='ml-2 text-sm text-gray-700 dark:text-gray-300 font-medium'>
                  {selectedAlerts.size === alerts.length && alerts.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </label>
              {selectedAlerts.size > 0 && (
                <span className='text-sm text-blue-700 dark:text-blue-300 font-medium'>
                  {selectedAlerts.size} of {alerts.length} selected
                </span>
              )}
            </div>
            <div className='flex items-center space-x-2'>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={groupBySymbol}
                  onChange={e => setGroupBySymbol(e.target.checked)}
                  className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500'
                />
                <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                  Group by Symbol
                </span>
              </label>
            </div>
          </div>

          {Object.entries(groupedAlerts).map(([symbol, symbolAlerts]) => (
            <div key={symbol} className='space-y-4'>
              {groupBySymbol && symbol !== 'All Alerts' && (
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <h2 className='text-xl font-bold text-gray-900 dark:text-white'>{symbol}</h2>
                    <span className='px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full'>
                      {symbolAlerts.length} alert{symbolAlerts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className='text-sm text-gray-500 dark:text-gray-400'>
                    Active: {symbolAlerts.filter(a => a.enabled && !a.triggeredAt).length} |
                    Triggered: {symbolAlerts.filter(a => a.triggeredAt).length} | Disabled:{' '}
                    {symbolAlerts.filter(a => !a.enabled && !a.triggeredAt).length}
                  </div>
                </div>
              )}
              <div
                className={`grid gap-4 ${
                  groupBySymbol ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {symbolAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Alert Modal */}
      <CreateAlertModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSuccess={() => {
          fetchAlerts()
          handleModalClose()
        }}
        editingAlert={editingAlert}
      />
    </div>
  )
}

export default AlertsPage
