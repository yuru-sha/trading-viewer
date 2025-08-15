import { useMemo } from 'react'
import { PriceData } from '../../utils/indicators'

interface UseChartDataManagerProps {
  symbol: string
  data: PriceData[]
  currentPrice?: number
  isLoading?: boolean
  isRealTime?: boolean
}

export const useChartDataManager = ({
  symbol,
  data,
  currentPrice,
  isLoading = false,
  isRealTime = false,
}: UseChartDataManagerProps) => {
  // Check if data is available
  const hasData = useMemo(() => data.length > 0, [data.length])

  // Check if currently loading initial data
  const isInitialLoading = useMemo(() => isLoading && !hasData, [isLoading, hasData])

  // Check if updating existing data
  const isUpdating = useMemo(() => isLoading && hasData, [isLoading, hasData])

  // Get latest price from data if current price is not provided
  const latestPrice = useMemo(() => {
    if (currentPrice !== undefined) return currentPrice
    if (hasData) return data[data.length - 1]?.close
    return undefined
  }, [currentPrice, data, hasData])

  // Calculate price change
  const priceChange = useMemo(() => {
    if (!hasData || data.length < 2) return { value: 0, percentage: 0 }

    const current = latestPrice || data[data.length - 1]?.close || 0
    const previous = data[data.length - 2]?.close || 0
    const value = current - previous
    const percentage = previous > 0 ? (value / previous) * 100 : 0

    return { value, percentage }
  }, [data, latestPrice, hasData])

  // Get data statistics
  const dataStats = useMemo(() => {
    if (!hasData) return null

    const prices = data.map(d => d.close)
    const volumes = data.map(d => d.volume || 0)

    return {
      dataPointsCount: data.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      volumeRange: {
        min: Math.min(...volumes),
        max: Math.max(...volumes),
      },
      timeRange: {
        start: data[0]?.time,
        end: data[data.length - 1]?.time,
      },
    }
  }, [data, hasData])

  return {
    // Data state
    symbol,
    data,
    hasData,
    isInitialLoading,
    isUpdating,
    isRealTime,

    // Price information
    latestPrice,
    priceChange,

    // Data statistics
    dataStats,
  }
}
