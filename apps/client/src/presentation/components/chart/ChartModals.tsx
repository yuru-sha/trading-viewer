import React from 'react'
import { useChartSymbol } from '@/presentation/context/ChartSymbolContext'
import { useChartFeatures } from '@/presentation/context/ChartFeaturesContext'
import CreateAlertModal from '@/presentation/components/alerts/CreateAlertModal'

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
