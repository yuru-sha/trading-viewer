import React from 'react'
import { useChartContext } from '../../contexts/ChartContext'
import CreateAlertModal from '../alerts/CreateAlertModal'

const ChartModals: React.FC = () => {
  const { symbolState, alertState, alertActions } = useChartContext()

  return (
    <>
      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={alertState.showCreateAlertModal}
        onClose={() => alertActions.setShowCreateAlertModal(false)}
        onSuccess={alertActions.handleAlertSuccess}
        defaultSymbol={symbolState.currentSymbol}
      />
    </>
  )
}

export default ChartModals
