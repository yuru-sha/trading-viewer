import { useState, useCallback, useRef } from 'react'
import { DrawingObject } from '@/presentation/components/chart/DrawingObjectsPanel'
import { EChartsTradingChartRef } from '@/presentation/components/chart/EChartsTradingChart'
import { log } from '@/infrastructure/services/LoggerService'

interface ChartRenderingSettings {
  showVolume: boolean
  showDrawingTools: boolean
}

const defaultRenderingSettings: ChartRenderingSettings = {
  showVolume: true,
  showDrawingTools: true,
}

export const useChartRendering = (initialSettings?: Partial<ChartRenderingSettings>) => {
  const [settings, setSettings] = useState<ChartRenderingSettings>({
    ...defaultRenderingSettings,
    ...initialSettings,
  })

  // Chart objects state (Price Chart is excluded from objects list as it's always the main chart)
  const [chartObjects, setChartObjects] = useState<DrawingObject[]>([
    {
      id: 'volume',
      name: 'Volume',
      type: 'line',
      visible: settings.showVolume,
      color: '#6366f1',
      createdAt: Date.now(),
    },
  ])

  // Chart instance ref to access chart functionality
  const chartRef = useRef<EChartsTradingChartRef | null>(null)

  // Handle object visibility toggle
  const toggleObjectVisibility = useCallback((id: string) => {
    setChartObjects(prev =>
      prev.map(obj => (obj.id === id ? { ...obj, visible: !obj.visible } : obj))
    )
  }, [])

  // Handle object removal
  const removeObject = useCallback((id: string) => {
    setChartObjects(prev => prev.filter(obj => obj.id !== id))
  }, [])

  // Update rendering settings
  const updateSettings = useCallback((newSettings: Partial<ChartRenderingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Take screenshot functionality
  const takeScreenshot = useCallback((filename?: string) => {
    if (chartRef.current?.takeScreenshot) {
      return chartRef.current.takeScreenshot(filename)
    } else {
      log.business.warn('Chart instance not available for screenshot')
      return null
    }
  }, [])

  return {
    // State
    settings,
    chartObjects,
    chartRef,

    // Actions
    toggleObjectVisibility,
    removeObject,
    updateSettings,
    takeScreenshot,
  }
}
