import { useMemo, useCallback } from 'react'
import {
  CandleData,
  SupportResistanceLevel,
  SupportResistanceConfig,
  DrawingPoint,
  DRAWING_PRESETS,
} from '@shared'

const DEFAULT_CONFIG: SupportResistanceConfig = {
  minTouches: 2,
  priceThreshold: 0.5, // 0.5% price difference
  lookbackPeriods: 100,
  showLabels: true,
  autoDetect: true,
}

/**
 * Support and Resistance Detection Hook
 * - Automatically detects support and resistance levels
 * - Configurable sensitivity and parameters
 * - Returns drawable levels for chart overlay
 */
export const useSupportResistance = (
  data: CandleData[],
  config: Partial<SupportResistanceConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // Find pivot points (local highs and lows)
  const pivotPoints = useMemo(() => {
    if (data.length < 5) return { highs: [], lows: [] }

    const highs: DrawingPoint[] = []
    const lows: DrawingPoint[] = []
    const lookback = 2 // Look 2 periods back and forward

    for (let i = lookback; i < data.length - lookback; i++) {
      const current = data[i]
      const isLocalHigh = data
        .slice(i - lookback, i + lookback + 1)
        .every(candle => candle.high <= current.high)
      const isLocalLow = data
        .slice(i - lookback, i + lookback + 1)
        .every(candle => candle.low >= current.low)

      if (isLocalHigh) {
        highs.push({
          timestamp: current.timestamp,
          price: current.high,
        })
      }

      if (isLocalLow) {
        lows.push({
          timestamp: current.timestamp,
          price: current.low,
        })
      }
    }

    return { highs, lows }
  }, [data])

  // Group pivot points into support/resistance levels
  const supportResistanceLevels = useMemo(() => {
    if (!finalConfig.autoDetect) return []

    const levels: SupportResistanceLevel[] = []
    const priceRange = Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low))
    const threshold = priceRange * (finalConfig.priceThreshold / 100)

    // Process resistance levels (from highs)
    const resistanceClusters = groupPivotsByPrice(pivotPoints.highs, threshold)
    resistanceClusters.forEach((cluster, index) => {
      if (cluster.length >= finalConfig.minTouches) {
        const avgPrice = cluster.reduce((sum, point) => sum + point.price, 0) / cluster.length
        const strength = cluster.length
        const startTime = Math.min(...cluster.map(p => p.timestamp))
        const endTime = Math.max(...cluster.map(p => p.timestamp))

        levels.push({
          id: `resistance_${index}_${Date.now()}`,
          price: avgPrice,
          strength,
          type: 'resistance',
          startTimestamp: startTime,
          endTimestamp: endTime,
          touches: cluster,
          style: {
            ...DRAWING_PRESETS.resistance,
            opacity: Math.min(0.8, 0.4 + (strength - finalConfig.minTouches) * 0.1),
          },
        })
      }
    })

    // Process support levels (from lows)
    const supportClusters = groupPivotsByPrice(pivotPoints.lows, threshold)
    supportClusters.forEach((cluster, index) => {
      if (cluster.length >= finalConfig.minTouches) {
        const avgPrice = cluster.reduce((sum, point) => sum + point.price, 0) / cluster.length
        const strength = cluster.length
        const startTime = Math.min(...cluster.map(p => p.timestamp))
        const endTime = Math.max(...cluster.map(p => p.timestamp))

        levels.push({
          id: `support_${index}_${Date.now()}`,
          price: avgPrice,
          strength,
          type: 'support',
          startTimestamp: startTime,
          endTimestamp: endTime,
          touches: cluster,
          style: {
            ...DRAWING_PRESETS.support,
            opacity: Math.min(0.8, 0.4 + (strength - finalConfig.minTouches) * 0.1),
          },
        })
      }
    })

    // Sort by strength and return top levels
    return levels.sort((a, b) => b.strength - a.strength).slice(0, 20) // Limit to top 20 levels to avoid clutter
  }, [pivotPoints, data, finalConfig])

  // Group pivot points by similar price levels
  const groupPivotsByPrice = useCallback((points: DrawingPoint[], threshold: number) => {
    const clusters: DrawingPoint[][] = []
    const sortedPoints = [...points].sort((a, b) => a.price - b.price)

    sortedPoints.forEach(point => {
      let addedToCluster = false

      for (const cluster of clusters) {
        const clusterAvgPrice = cluster.reduce((sum, p) => sum + p.price, 0) / cluster.length
        if (Math.abs(point.price - clusterAvgPrice) <= threshold) {
          cluster.push(point)
          addedToCluster = true
          break
        }
      }

      if (!addedToCluster) {
        clusters.push([point])
      }
    })

    return clusters
  }, [])

  // Find nearby support/resistance for price snapping
  const findNearbyLevels = useCallback(
    (price: number, tolerance = 0.01) => {
      return supportResistanceLevels
        .filter(level => Math.abs(level.price - price) / price <= tolerance)
        .map(level => level.price)
    },
    [supportResistanceLevels]
  )

  // Get current market structure
  const marketStructure = useMemo(() => {
    if (supportResistanceLevels.length < 2) {
      return { bias: 'neutral', confidence: 0 }
    }

    const currentPrice = data[data.length - 1]?.close || 0
    const nearbySupport = supportResistanceLevels
      .filter(level => level.type === 'support' && level.price < currentPrice)
      .sort((a, b) => b.price - a.price)[0] // Closest support below

    const nearbyResistance = supportResistanceLevels
      .filter(level => level.type === 'resistance' && level.price > currentPrice)
      .sort((a, b) => a.price - b.price)[0] // Closest resistance above

    let bias: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    let confidence = 0

    if (nearbySupport && nearbyResistance) {
      const supportDistance = currentPrice - nearbySupport.price
      const resistanceDistance = nearbyResistance.price - currentPrice
      const totalDistance = supportDistance + resistanceDistance

      if (supportDistance < resistanceDistance) {
        bias = 'bullish'
        confidence = (resistanceDistance / totalDistance) * Math.min(nearbySupport.strength / 5, 1)
      } else {
        bias = 'bearish'
        confidence = (supportDistance / totalDistance) * Math.min(nearbyResistance.strength / 5, 1)
      }
    }

    return {
      bias,
      confidence: Math.round(confidence * 100) / 100,
      nearbySupport,
      nearbyResistance,
    }
  }, [supportResistanceLevels, data])

  // Convert to drawing tools format
  const asDrawingTools = useMemo(() => {
    return supportResistanceLevels.map(level => ({
      id: level.id,
      type: 'horizontal' as const,
      points: [{ timestamp: level.startTimestamp, price: level.price }],
      style: level.style,
      text: finalConfig.showLabels
        ? `${level.type.toUpperCase()} ${level.price.toFixed(2)} (${level.strength}x)`
        : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      locked: true,
      visible: true,
    }))
  }, [supportResistanceLevels, finalConfig.showLabels])

  return {
    // Data
    levels: supportResistanceLevels,
    pivotPoints,
    asDrawingTools,

    // Analysis
    marketStructure,

    // Utilities
    findNearbyLevels,

    // Stats
    supportCount: supportResistanceLevels.filter(l => l.type === 'support').length,
    resistanceCount: supportResistanceLevels.filter(l => l.type === 'resistance').length,
    totalTouches: supportResistanceLevels.reduce((sum, l) => sum + l.strength, 0),
    strongestLevel: supportResistanceLevels.sort((a, b) => b.strength - a.strength)[0] || null,

    // Configuration
    config: finalConfig,
  }
}

export default useSupportResistance
