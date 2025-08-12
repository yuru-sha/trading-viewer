import { useState, useEffect, useCallback } from 'react'
import { ChartType } from '@trading-viewer/shared'

interface ChartControlsState {
  selectedTimeframe: string
  chartType: ChartType
  selectedTimezone: string
  showSymbolSearch: boolean
  showTimeframeDropdown: boolean
  showChartTypeDropdown: boolean
  showIndicatorsDropdown: boolean
  showTimezoneDropdown: boolean
  isFullscreen: boolean
  currentTime: Date
  showWeek52HighLow: boolean
}

interface ChartControlsActions {
  setSelectedTimeframe: (timeframe: string) => void
  setChartType: (type: ChartType) => void
  setSelectedTimezone: (timezone: string) => void
  setShowSymbolSearch: (show: boolean) => void
  setShowTimeframeDropdown: (show: boolean) => void
  setShowChartTypeDropdown: (show: boolean) => void
  setShowIndicatorsDropdown: (show: boolean) => void
  setShowTimezoneDropdown: (show: boolean) => void
  setIsFullscreen: (fullscreen: boolean) => void
  setShowWeek52HighLow: (show: boolean) => void
  toggleSymbolSearch: () => void
  toggleTimeframeDropdown: () => void
  toggleChartTypeDropdown: () => void
  toggleIndicatorsDropdown: () => void
  toggleTimezoneDropdown: () => void
  toggleWeek52HighLow: () => void
  closeAllDropdowns: () => void
  toggleFullscreen: () => void
}

export const useChartControls = (
  initialTimeframe: string = 'D',
  initialChartType: ChartType = 'candle',
  initialTimezone: string = 'UTC'
): [ChartControlsState, ChartControlsActions] => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(initialTimeframe)
  const [chartType, setChartType] = useState<ChartType>(initialChartType)
  const [selectedTimezone, setSelectedTimezone] = useState(initialTimezone)
  const [showSymbolSearch, setShowSymbolSearch] = useState(false)
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false)
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false)
  const [showIndicatorsDropdown, setShowIndicatorsDropdown] = useState(false)
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showWeek52HighLow, setShowWeek52HighLow] = useState(true)

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTimeframeDropdown(false)
      setShowChartTypeDropdown(false)
      setShowIndicatorsDropdown(false)
      setShowTimezoneDropdown(false)
    }

    if (
      showTimeframeDropdown ||
      showChartTypeDropdown ||
      showIndicatorsDropdown ||
      showTimezoneDropdown
    ) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showTimeframeDropdown, showChartTypeDropdown, showIndicatorsDropdown, showTimezoneDropdown])

  const toggleSymbolSearch = useCallback(() => {
    setShowSymbolSearch(prev => !prev)
  }, [])

  const toggleTimeframeDropdown = useCallback(() => {
    setShowTimeframeDropdown(prev => !prev)
    setShowChartTypeDropdown(false)
    setShowIndicatorsDropdown(false)
  }, [])

  const toggleChartTypeDropdown = useCallback(() => {
    setShowChartTypeDropdown(prev => !prev)
    setShowTimeframeDropdown(false)
    setShowIndicatorsDropdown(false)
  }, [])

  const toggleIndicatorsDropdown = useCallback(() => {
    setShowIndicatorsDropdown(prev => !prev)
    setShowTimeframeDropdown(false)
    setShowChartTypeDropdown(false)
  }, [])

  const toggleWeek52HighLow = useCallback(() => {
    setShowWeek52HighLow(prev => !prev)
  }, [])

  const toggleTimezoneDropdown = useCallback(() => {
    setShowTimezoneDropdown(prev => !prev)
  }, [])

  const closeAllDropdowns = useCallback(() => {
    setShowSymbolSearch(false)
    setShowTimeframeDropdown(false)
    setShowChartTypeDropdown(false)
    setShowIndicatorsDropdown(false)
    setShowTimezoneDropdown(false)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const state: ChartControlsState = {
    selectedTimeframe,
    chartType,
    selectedTimezone,
    showSymbolSearch,
    showTimeframeDropdown,
    showChartTypeDropdown,
    showIndicatorsDropdown,
    showTimezoneDropdown,
    isFullscreen,
    currentTime,
    showWeek52HighLow,
  }

  const actions: ChartControlsActions = {
    setSelectedTimeframe,
    setChartType,
    setSelectedTimezone,
    setShowSymbolSearch,
    setShowTimeframeDropdown,
    setShowChartTypeDropdown,
    setShowIndicatorsDropdown,
    setShowTimezoneDropdown,
    setIsFullscreen,
    setShowWeek52HighLow,
    toggleSymbolSearch,
    toggleTimeframeDropdown,
    toggleChartTypeDropdown,
    toggleIndicatorsDropdown,
    toggleTimezoneDropdown,
    toggleWeek52HighLow,
    closeAllDropdowns,
    toggleFullscreen,
  }

  return [state, actions]
}