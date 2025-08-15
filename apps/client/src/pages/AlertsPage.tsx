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
  const [error, setError] = useState<string | null>(null)

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

  // Toggle alert enabled state
  const toggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      await requestWithAuth(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, enabled } : alert
      ))
    } catch (err: any) {
      setError(err.message || 'Failed to update alert')
    }
  }

  // Delete alert
  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    try {
      await requestWithAuth(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      })
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
    } catch (err: any) {
      setError(err.message || 'Failed to delete alert')
    }
  }

  const AlertCard: React.FC<{ alert: PriceAlert }> = ({ alert }) => (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          <div className={`w-3 h-3 rounded-full ${alert.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            {alert.symbol}
          </h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            alert.triggeredAt 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : alert.enabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {alert.triggeredAt ? 'Triggered' : alert.enabled ? 'Active' : 'Disabled'}
          </span>
        </div>
        
        <div className='flex items-center space-x-2'>
          <button
            onClick={() => toggleAlert(alert.id, !alert.enabled)}
            className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            title={alert.enabled ? 'Disable alert' : 'Enable alert'}
          >
            <Icon name={alert.enabled ? 'pause' : 'play'} className='w-4 h-4' />
          </button>
          <button
            onClick={() => deleteAlert(alert.id)}
            className='p-1 text-gray-400 hover:text-red-500'
            title='Delete alert'
          >
            <Icon name='trash' className='w-4 h-4' />
          </button>
        </div>
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>Condition:</span>
          <span className='text-gray-900 dark:text-white font-medium'>
            Price {alert.condition} {formatPrice(alert.targetPrice, alert.currency)}
          </span>
        </div>
        
        {alert.percentageChange && (
          <div className='flex items-center justify-between text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Change Trigger:</span>
            <span className='text-gray-900 dark:text-white font-medium'>
              {alert.percentageChange > 0 ? '+' : ''}{alert.percentageChange}%
            </span>
          </div>
        )}

        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>Created:</span>
          <span className='text-gray-900 dark:text-white'>
            {new Date(alert.createdAt).toLocaleDateString()}
          </span>
        </div>

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
        
        <Button
          onClick={() => setShowCreateModal(true)}
          className='flex items-center space-x-2'
        >
          <Icon name='plus' className='w-4 h-4' />
          <span>Create Alert</span>
        </Button>
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
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
            No alerts yet
          </h3>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            Create your first price alert to get notified when symbols reach your target prices.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Icon name='plus' className='w-4 h-4 mr-2' />
            Create Your First Alert
          </Button>
        </div>
      ) : (
        /* Alerts Grid */
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}


      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchAlerts}
      />
    </div>
  )
}

export default AlertsPage
