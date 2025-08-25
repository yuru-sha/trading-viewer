import React from 'react'
import { Position, TradingQuote } from '@trading-viewer/shared'

interface PositionsTableProps {
  positions: Position[]
  quotes: Record<string, TradingQuote>
  onClosePosition: (symbol: string) => void
}

const PositionsTable: React.FC<PositionsTableProps> = () => {
  return <div>Positions Table</div>
}

export default PositionsTable
