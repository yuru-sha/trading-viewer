import React from 'react'
import { TradingSimulation, Position, TradingQuote } from '@trading-viewer/shared'

interface PerformanceMetrics {
  [key: string]: unknown
}

interface PortfolioSummaryProps {
  simulation: TradingSimulation
  performanceMetrics: PerformanceMetrics
  positions: Position[]
  quotes: Record<string, TradingQuote>
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = () => {
  return <div>Portfolio Summary</div>
}

export default PortfolioSummary
