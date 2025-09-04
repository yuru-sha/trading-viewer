import { useState } from 'react'
import { useAuth } from '@/presentation/context/AuthContext'
import { log } from '@/infrastructure/services/LoggerService'

interface AlertState {
  showCreateAlertModal: boolean
}

interface AlertActions {
  handleCreateAlert: () => void
  setShowCreateAlertModal: (show: boolean) => void
  handleAlertSuccess: () => void
}

export const useChartAlerts = (_currentSymbol: string): [AlertState, AlertActions] => {
  const { isAuthenticated } = useAuth()
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false)

  // Handle create alert
  const handleCreateAlert = () => {
    if (!isAuthenticated) return
    setShowCreateAlertModal(true)
  }

  // Handle alert creation success
  const handleAlertSuccess = () => {
    log.business.info('Chart alert created successfully')
    setShowCreateAlertModal(false)
  }

  return [
    {
      showCreateAlertModal,
    },
    {
      handleCreateAlert,
      setShowCreateAlertModal,
      handleAlertSuccess,
    },
  ]
}
