import { useState, useEffect, useCallback, useRef } from 'react'
import { PriceAlert } from '../components/chart/AlertModal'
import { api } from '../lib/apiClient'
import { log } from '../services/logger'

interface UseAlertsOptions {
  symbol: string
  currentPrice: number
  checkInterval?: number // milliseconds
  onAlertTriggered?: (alert: PriceAlert) => void
}

export const useAlerts = ({
  symbol,
  currentPrice,
  checkInterval: _checkInterval = 5000, // Check every 5 seconds
  onAlertTriggered,
}: UseAlertsOptions) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const previousPriceRef = useRef<number>(currentPrice)
  const notifiedAlertsRef = useRef<Set<string>>(new Set())

  // Load alerts from server on component mount
  const loadAlerts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/api/alerts/${symbol}`)
      if (response.ok && response.data?.alerts) {
        const serverAlerts = response.data.alerts.map(
          (alert: { createdAt: string; triggeredAt?: string }) => ({
            ...alert,
            createdAt: new Date(alert.createdAt),
            triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt) : undefined,
          })
        )
        setAlerts(serverAlerts)
      }
    } catch {
      log.business.error('Failed to load alerts from server')
    } finally {
      setIsLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  // Check alerts when price changes
  useEffect(() => {
    const checkAlerts = () => {
      const previousPrice = previousPriceRef.current
      const currentPriceValue = currentPrice

      alerts.forEach(alert => {
        if (!alert.enabled || alert.triggeredAt) return

        let shouldTrigger = false

        switch (alert.type) {
          case 'above':
            shouldTrigger = currentPriceValue >= alert.price
            break
          case 'below':
            shouldTrigger = currentPriceValue <= alert.price
            break
          case 'crosses':
            shouldTrigger =
              (previousPrice < alert.price && currentPriceValue >= alert.price) ||
              (previousPrice > alert.price && currentPriceValue <= alert.price)
            break
        }

        if (shouldTrigger && !notifiedAlertsRef.current.has(alert.id)) {
          // Mark as triggered on server
          triggerAlert(alert.id)

          // Add to notified set to prevent duplicate notifications
          notifiedAlertsRef.current.add(alert.id)

          // Call callback
          if (onAlertTriggered) {
            onAlertTriggered(alert)
          }

          // Show browser notification if permitted
          showNotification(alert, symbol, currentPriceValue)
        }
      })

      previousPriceRef.current = currentPriceValue
    }

    checkAlerts()
  }, [currentPrice, alerts, symbol, onAlertTriggered])

  // Helper function to trigger alert on server
  const triggerAlert = useCallback(async (alertId: string) => {
    try {
      const response = await api.post(`/api/alerts/${alertId}/trigger`)
      if (response.ok) {
        // Update local state
        setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, triggeredAt: new Date() } : a)))
      }
    } catch {
      log.business.error('Failed to load alerts from server')
    }
  }, [])

  // Create new alert
  const createAlert = useCallback(
    async (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredAt'>) => {
      try {
        const response = await api.post('/api/alerts', alertData)
        if (response.ok && response.data?.alert) {
          const newAlert = {
            ...response.data.alert,
            createdAt: new Date(response.data.alert.createdAt),
            triggeredAt: response.data.alert.triggeredAt
              ? new Date(response.data.alert.triggeredAt)
              : undefined,
          }

          setAlerts(prev => [...prev, newAlert])
          return newAlert
        }
      } catch {
        log.business.error('Failed to load alerts from server')
      }
      return null
    },
    []
  )

  // Delete alert
  const deleteAlert = useCallback(async (id: string) => {
    try {
      const response = await api.delete(`/api/alerts/${id}`)
      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== id))
        notifiedAlertsRef.current.delete(id)
      }
    } catch {
      log.business.error('Failed to load alerts from server')
    }
  }, [])

  // Toggle alert enabled/disabled
  const toggleAlert = useCallback(
    async (id: string) => {
      try {
        const alert = alerts.find(a => a.id === id)
        if (!alert) return

        const response = await api.put(`/api/alerts/${id}`, {
          enabled: !alert.enabled,
        })

        if (response.ok && response.data?.alert) {
          const updatedAlert = {
            ...response.data.alert,
            createdAt: new Date(response.data.alert.createdAt),
            triggeredAt: response.data.alert.triggeredAt
              ? new Date(response.data.alert.triggeredAt)
              : undefined,
          }

          setAlerts(prev => prev.map(a => (a.id === id ? updatedAlert : a)))

          // Reset notification state when re-enabling
          if (updatedAlert.enabled) {
            notifiedAlertsRef.current.delete(id)
          }
        }
      } catch {
        log.business.error('Failed to load alerts from server')
      }
    },
    [alerts]
  )

  // Clear all alerts
  const clearAlerts = useCallback(async () => {
    try {
      // Delete all alerts for this symbol
      const deletePromises = alerts.map(alert => api.delete(`/api/alerts/${alert.id}`))

      await Promise.all(deletePromises)
      setAlerts([])
      notifiedAlertsRef.current.clear()
    } catch {
      log.business.error('Failed to load alerts from server')
    }
  }, [alerts])

  // Clear triggered alerts
  const clearTriggeredAlerts = useCallback(async () => {
    try {
      const triggeredAlerts = alerts.filter(alert => alert.triggeredAt)
      const deletePromises = triggeredAlerts.map(alert => api.delete(`/api/alerts/${alert.id}`))

      await Promise.all(deletePromises)
      setAlerts(prev => prev.filter(alert => !alert.triggeredAt))

      // Clear from notified set
      triggeredAlerts.forEach(alert => notifiedAlertsRef.current.delete(alert.id))
    } catch {
      log.business.error('Failed to load alerts from server')
    }
  }, [alerts])

  // Get active alerts count
  const activeAlertsCount = alerts.filter(alert => alert.enabled && !alert.triggeredAt).length

  // Get triggered alerts count
  const triggeredAlertsCount = alerts.filter(alert => alert.triggeredAt).length

  return {
    alerts,
    isLoading,
    createAlert,
    deleteAlert,
    toggleAlert,
    clearAlerts,
    clearTriggeredAlerts,
    activeAlertsCount,
    triggeredAlertsCount,
    loadAlerts,
  }
}

// Helper function to show browser notification
async function showNotification(alert: PriceAlert, symbol: string, currentPrice: number) {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    return
  }

  // Check permission
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  if (Notification.permission === 'granted') {
    const typeLabel = alert.type === 'above' ? '以上' : alert.type === 'below' ? '以下' : 'クロス'

    const notification = new Notification(`価格アラート: ${symbol}`, {
      body: `価格が $${alert.price} ${typeLabel}に達しました\n 現在価格: $${currentPrice.toFixed(2)}${
        alert.message ? `\n${alert.message}` : ''
      }`,
      icon: '/favicon.ico',
      tag: alert.id,
      requireInteraction: false,
    })

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000)

    // Handle click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }
}

export default useAlerts
