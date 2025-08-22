import React, { useState, useEffect } from 'react'
import { Button } from '@trading-viewer/ui'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import CreateAlertModal from '../components/alerts/CreateAlertModal'
import { formatPrice } from '../utils/currency'
import ConfirmDialog from '../components/common/ConfirmDialog'
import SelectAllButton from '../components/common/SelectAllButton'

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
  const [deleteConfirm, setDeleteConfirm] = useState<PriceAlert | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  // Fetch alerts
  const fetchAlerts = async () => {
    if (!user) return

    try {
      setLoading(true)
      // Use AuthContext's requestWithAuth for automatic token refresh
      const response = await requestWithAuth('/api/alerts')
      const data = await response.json()
      setAlerts(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message || 'Failed to fetch alerts' : 'Failed to fetch alerts'
      )
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
    } catch (err) {
      const fallback = `Failed to ${newEnabled ? 'enable' : 'disable'} alert for ${alert.symbol}`
      setError(err instanceof Error ? err.message || fallback : fallback)
    } finally {
      setTogglingAlertId(null)
    }
  }

  // Delete alert with improved UX
  const deleteAlert = async (alert: PriceAlert) => {
    setDeletingAlertId(alert.id)
    try {
      await requestWithAuth(`/api/alerts/${alert.id}`, {
        method: 'DELETE',
      })
      setAlerts(prev => prev.filter(a => a.id !== alert.id))
      setError(null)
      setDeleteConfirm(null)
    } catch (err) {
      const fallback = `Failed to delete alert for ${alert.symbol}`
      setError(err instanceof Error ? err.message || fallback : fallback)
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

    setBulkDeleting(true)
    setBulkDeleteConfirm(false)
    const failedDeletes: string[] = []

    try {
      // Delete alerts in parallel
      const deletePromises = Array.from(selectedAlerts).map(async alertId => {
        try {
          await requestWithAuth(`/api/alerts/${alertId}`, {
            method: 'DELETE',
          })
          return { success: true, alertId }
        } catch {
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
    } catch {
      setError('Failed to delete selected alerts')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Calculate active alerts count
  const activeAlertsCount = alerts.filter(alert => alert.enabled && !alert.triggeredAt).length

  // Group alerts by symbol (always grouped)
  const groupedAlerts = alerts.reduce(
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

  const AlertCard: React.FC<{ alert: PriceAlert; hideSymbol?: boolean }> = ({
    alert,
    hideSymbol = false,
  }) => (
    <div
      className={`px-4 py-4 transition-colors ${
        selectedAlerts.has(alert.id)
          ? 'bg-blue-50 dark:bg-blue-900'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      <div className='flex items-center space-x-3'>
        {/* Selection Checkbox */}
        <button
          onClick={() => toggleAlertSelection(alert.id)}
          className='flex-shrink-0 touch-target flex items-center justify-center'
        >
          <div
            className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
              selectedAlerts.has(alert.id)
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {selectedAlerts.has(alert.id) && (
              <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  clipRule='evenodd'
                />
              </svg>
            )}
          </div>
        </button>

        {/* Alert Info */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center space-x-3'>
              {!hideSymbol && (
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  {alert.symbol}
                </h3>
              )}
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
                onClick={() => setDeleteConfirm(alert)}
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

          {/* Alert Details - Mobile style grid */}
          <div className='mt-3 grid grid-cols-2 gap-4 text-xs'>
            <div>
              <span className='text-gray-500 dark:text-gray-400'>Condition</span>
              <div className='font-medium text-gray-900 dark:text-white'>
                {alert.targetPrice
                  ? `Price ${alert.condition} ${formatPrice(alert.targetPrice, alert.currency)}`
                  : `Price change ${alert.condition} ${alert.percentageChange && alert.percentageChange >= 0 ? '+' : ''}${alert.percentageChange || 0}%`}
              </div>
            </div>
            <div>
              <span className='text-gray-500 dark:text-gray-400'>Created</span>
              <div className='font-medium text-gray-900 dark:text-white'>
                {new Date(alert.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
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
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Price Alerts</h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          {activeAlertsCount} alert{activeAlertsCount !== 1 ? 's' : ''} active
        </p>
      </div>

      <div className='h-full flex flex-col'>
        {/* Actions Bar */}
        <div className='flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4'>
          <div className='flex items-center justify-between'>
            {/* Left side - Selection controls */}
            <div className='flex items-center space-x-4'>
              <SelectAllButton
                totalCount={alerts.length}
                selectedCount={selectedAlerts.size}
                onToggle={selectAllAlerts}
              />
              {selectedAlerts.size > 0 && (
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  {selectedAlerts.size} selected
                </span>
              )}
            </div>

            {/* Right side - Action Buttons */}
            <div className='flex items-center space-x-2'>
              {selectedAlerts.size > 0 && (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setSelectedAlerts(new Set())}
                    className='hidden sm:flex'
                  >
                    Cancel
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setBulkDeleteConfirm(true)}
                    disabled={bulkDeleting}
                    className='text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900'
                  >
                    <svg
                      className='w-4 h-4 sm:mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                      />
                    </svg>
                    <span className='hidden sm:inline'>Delete ({selectedAlerts.size})</span>
                  </Button>
                </>
              )}
              <Button variant='primary' size='sm' onClick={() => setShowCreateModal(true)}>
                <svg
                  className='w-4 h-4 sm:mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                <span className='hidden sm:inline'>Create Alert</span>
              </Button>
            </div>
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
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              No alerts yet
            </h3>
            <p className='text-gray-600 dark:text-gray-400 mb-6'>
              Create your first price alert to get notified when symbols reach your target prices.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Icon name='add' className='w-4 h-4 mr-2' />
              Create Your First Alert
            </Button>
          </div>
        ) : (
          <div className='flex-1 overflow-hidden'>
            <div className='h-full overflow-y-auto mobile-scroll'>
              <div className='space-y-6 p-4'>
                {Object.entries(groupedAlerts).map(([symbol, symbolAlerts]) => (
                  <div key={symbol} className='space-y-3'>
                    {/* Symbol Group Header */}
                    <div className='flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2'>
                      <div className='flex items-center space-x-3'>
                        <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                          {symbol}
                        </h2>
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

                    {/* Symbol Alerts */}
                    <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                      {symbolAlerts.map(alert => (
                        <AlertCard key={alert.id} alert={alert} hideSymbol={true} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteAlert(deleteConfirm)
          }
        }}
        onCancel={() => {
          setDeleteConfirm(null)
          setDeletingAlertId(null)
        }}
        title='Delete Selected Items'
        message={`Are you sure you want to remove 1 item from your alerts? This action cannot be undone.`}
        confirmText='Delete'
        cancelText='Cancel'
        isLoading={deleteConfirm ? deletingAlertId === deleteConfirm.id : false}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onConfirm={() => bulkDeleteAlerts()}
        onCancel={() => setBulkDeleteConfirm(false)}
        title='Delete Selected Items'
        message={`Are you sure you want to remove ${selectedAlerts.size} item${selectedAlerts.size !== 1 ? 's' : ''} from your alerts? This action cannot be undone.`}
        confirmText='Delete'
        cancelText='Cancel'
        isLoading={bulkDeleting}
      />
    </div>
  )
}

export default AlertsPage
