import { useMemo, useState, useEffect } from 'react'
import { PriceData } from '../utils/indicators'

export interface ChartData {
  dates: string[]
  values: any[]
  volumes: any[]
}

export interface PriceStats {
  high: number
  low: number
  open: number
  close: number
  change: number
  changePercent: number
  // 指定期間の高値・安値を追加
  periodHigh?: number
  periodLow?: number
}

/**
 * チャートデータ管理フック
 * 責任: データ変換、統計計算、価格情報の管理
 */
export const useChartData = (
  data: PriceData[],
  chartType: 'candle' | 'line' | 'area' | 'bar' = 'candle',
  timeframe?: string,
  periodWeeks: number = 52
) => {
  const [priceStats, setPriceStats] = useState<PriceStats | null>(null)

  // Convert data to ECharts format
  const chartData = useMemo((): ChartData => {
    if (!data.length) return { dates: [], values: [], volumes: [] }

    const dates = data.map(item => {
      const date = new Date(item.timestamp * 1000)
      
      // タイムフレームに応じた日時フォーマット
      const formatDateByTimeframe = (date: Date, timeframe?: string): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        
        if (!timeframe) {
          return `${month}/${day}`
        }
        
        switch (timeframe) {
          case '1': // 1 分足
          case '5': // 5 分足
          case '15': // 15 分足
            return `${hours}:${minutes}`
          case '60': // 1 時間足
          case '240': // 4 時間足
            return `${month}/${day} ${hours}:${minutes}`
          case 'D': // 日足
          case 'W': // 週足  
          case 'M': // 月足
          default:
            return `${month}/${day}`
        }
      }
      
      return formatDateByTimeframe(date, timeframe)
    })

    const values = data.map(item => {
      if (chartType === 'candle') {
        return [item.open, item.close, item.low, item.high]
      } else {
        return item.close
      }
    })

    const volumes = data.map((item, index) => {
      const color = index > 0 && data[index - 1].close <= item.close ? '#10b981' : '#ef4444'
      return {
        value: item.volume || 0,
        itemStyle: { color },
      }
    })

    return { dates, values, volumes }
  }, [data, chartType, timeframe])

  // Calculate price statistics
  useEffect(() => {
    if (!data.length) {
      setPriceStats(null)
      return
    }

    const latestData = data[data.length - 1]
    const previousData = data.length > 1 ? data[data.length - 2] : latestData
    const change = latestData.close - previousData.close
    const changePercent = (change / previousData.close) * 100

    const visibleHigh = Math.max(...data.map(d => d.high))
    const visibleLow = Math.min(...data.map(d => d.low))

    // 指定期間の高値・安値を計算
    const periodAgo = Date.now() / 1000 - (periodWeeks * 7 * 24 * 60 * 60) // 指定週数前のタイムスタンプ
    const periodData = data.filter(d => d.timestamp >= periodAgo)
    
    let periodHigh: number | undefined
    let periodLow: number | undefined
    
    if (periodData.length > 0) {
      periodHigh = Math.max(...periodData.map(d => d.high))
      periodLow = Math.min(...periodData.map(d => d.low))
    }

    setPriceStats({
      high: visibleHigh,
      low: visibleLow,
      open: latestData.open,
      close: latestData.close,
      change,
      changePercent,
      periodHigh,
      periodLow,
    })
  }, [data, periodWeeks])

  return {
    chartData,
    priceStats,
  }
}

export default useChartData
