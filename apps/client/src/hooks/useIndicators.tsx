import { useState, useCallback } from 'react'

export interface IndicatorInstance {
  id: string
  type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger'
  enabled: boolean
  name: string
  color: string
  settings: {
    period?: number
    periods?: number[]
    fastPeriod?: number
    slowPeriod?: number
    signalPeriod?: number
    standardDeviations?: number
    [key: string]: any
  }
}

const defaultIndicatorConfigs: Record<IndicatorInstance['type'], Omit<IndicatorInstance, 'id'>> = {
  sma: {
    type: 'sma',
    enabled: true,
    name: 'SMA(20)',
    color: '#3b82f6',
    settings: { period: 20 }
  },
  ema: {
    type: 'ema',
    enabled: true,
    name: 'EMA(12)',
    color: '#ef4444',
    settings: { period: 12 }
  },
  rsi: {
    type: 'rsi',
    enabled: true,
    name: 'RSI(14)',
    color: '#8b5cf6',
    settings: { period: 14 }
  },
  macd: {
    type: 'macd',
    enabled: true,
    name: 'MACD(12,26,9)',
    color: '#10b981',
    settings: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
  },
  bollinger: {
    type: 'bollinger',
    enabled: true,
    name: 'BB(20,2)',
    color: '#f59e0b',
    settings: { period: 20, standardDeviations: 2 }
  }
}

export const useIndicators = (initialIndicators: IndicatorInstance[] = []) => {
  const [indicators, setIndicators] = useState<IndicatorInstance[]>(initialIndicators)

  const addIndicator = useCallback((type: IndicatorInstance['type']) => {
    const config = defaultIndicatorConfigs[type]
    const newIndicator: IndicatorInstance = {
      ...config,
      id: `${type}_${Date.now()}`
    }

    setIndicators(prev => [...prev, newIndicator])
  }, [])

  const updateIndicator = useCallback((id: string, updates: Partial<IndicatorInstance>) => {
    setIndicators(prev =>
      prev.map(indicator =>
        indicator.id === id ? { ...indicator, ...updates } : indicator
      )
    )
  }, [])

  const removeIndicator = useCallback((id: string) => {
    setIndicators(prev => prev.filter(indicator => indicator.id !== id))
  }, [])

  const toggleIndicator = useCallback((id: string) => {
    setIndicators(prev =>
      prev.map(indicator =>
        indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator
      )
    )
  }, [])

  const getEnabledIndicators = useCallback(() => {
    return indicators.filter(indicator => indicator.enabled)
  }, [indicators])

  return {
    indicators,
    addIndicator,
    updateIndicator,
    removeIndicator,
    toggleIndicator,
    getEnabledIndicators,
    setIndicators
  }
}