import React from 'react'
import { useChartSymbol } from '../../contexts/ChartSymbolContext'
import { useChartFeatures } from '../../contexts/ChartFeaturesContext'
import CreateAlertModal from '../alerts/CreateAlertModal'

const ChartModals: React.FC = () => {
  const { symbolState } = useChartSymbol()
  const { alertState, alertActions } = useChartFeatures()

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
