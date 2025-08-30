import { useState, useEffect } from 'react'
import { ChartSettings as ChartSettingsType } from '../components/chart/ChartSettings'
import { useApp } from '../contexts/AppContext'

export const useChartSettings = () => {
  const {
    state: { theme },
  } = useApp()

  // Chart settings state (simplified - no indicators)
  const [chartSettings, setChartSettings] = useState<ChartSettingsType>({
    chartType: 'candlestick',
    timeframe: '1d',
    showVolume: true,
    showGridlines: true,
    showPeriodHigh: true,
    showPeriodLow: true,
    periodWeeks: 52,
    colors: {
      bullish: '#10b981',
      bearish: '#ef4444',
      volume: '#8b5cf6',
      grid: theme === 'dark' ? '#4b5563' : '#e5e7eb',
      background: theme === 'dark' ? '#111827' : '#ffffff',
    },
  })

  useEffect(() => {
    setChartSettings(prevSettings => ({
      ...prevSettings,
      colors: {
        ...prevSettings.colors,
        grid: theme === 'dark' ? '#4b5563' : '#e5e7eb',
        background: theme === 'dark' ? '#111827' : '#ffffff',
      },
    }))
  }, [theme])

  // Drawing tools sidebar visibility state (temporary UI state, not persistent setting)
  const [showDrawingTools, setShowDrawingTools] = useState(true)

  // Footer visibility state (temporary UI state, not persistent setting)
  const [showFooter, setShowFooter] = useState(true)

  const handleSettingsChange = (newSettings: ChartSettingsType) => {
    setChartSettings(newSettings)
  }

  return {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
  }
}
