import { useRef, useState, useCallback } from 'react'
import type ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { PriceData } from '@/infrastructure/utils/indicators'
import { log } from '@/infrastructure/services/LoggerService'

/**
 * ECharts インスタンス管理フック
 * 責任: チャートインスタンスの生成、初期化、状態管理
 */
export const useChartInstance = () => {
  const chartRef = useRef<ReactECharts | null>(null)
  const [chartReady, setChartReady] = useState(false)

  // ECharts instance ready callback
  const onChartReady = useCallback((_echartInstance: echarts.ECharts) => {
    log.business.info('ECharts instance ready', {
      operation: 'chart_instance',
    })
    setChartReady(true)
  }, [])

  // Get ECharts instance
  const getEChartsInstance = useCallback(() => {
    return chartRef.current?.getEchartsInstance()
  }, [])

  // Convert pixel coordinates to data coordinates
  const convertPixelToData = useCallback((offsetX: number, offsetY: number, data: PriceData[]) => {
    if (!chartRef.current || !data.length) return null

    const chart = chartRef.current.getEchartsInstance()
    if (!chart) return null

    try {
      const dataPoint = chart.convertFromPixel('grid', [offsetX, offsetY])
      if (!dataPoint || dataPoint.length < 2) {
        return null
      }

      const dataIndex = Math.round(dataPoint[0] ?? 0)
      const price = dataPoint[1]

      const clampedIndex = Math.max(0, Math.min(dataIndex, data.length - 1))
      return {
        timestamp: data[clampedIndex]?.timestamp ?? 0,
        price: price,
        dataIndex: clampedIndex,
      }
    } catch (error: unknown) {
      log.business.error('Coordinate conversion failed', error as Error, {
        operation: 'chart_instance',
        action: 'pixel_to_data_conversion',
      })
      return null
    }
  }, [])

  // Convert data coordinates to pixel coordinates
  const convertDataToPixel = useCallback(
    (dataIndex: number, price: number) => {
      const chart = getEChartsInstance()
      if (!chart) return null

      try {
        return chart.convertToPixel('grid', [dataIndex, price])
      } catch (error: unknown) {
        log.business.error('Data to pixel conversion failed', error as Error, {
          operation: 'chart_instance',
          action: 'data_to_pixel_conversion',
        })
        return null
      }
    },
    [getEChartsInstance]
  )

  // Take screenshot of the chart
  const takeScreenshot = useCallback(
    (filename?: string) => {
      const chart = getEChartsInstance()
      if (!chart) {
        log.business.error('Chart instance not available for screenshot', undefined, {
          operation: 'chart_instance',
          action: 'take_screenshot',
        })
        return null
      }

      try {
        // Generate screenshot as data URL
        const dataURL = chart.getDataURL({
          type: 'png',
          pixelRatio: 2, // High quality
          backgroundColor: '#ffffff',
        })

        // Create download link
        const link = document.createElement('a')
        link.href = dataURL
        link.download =
          filename || `chart-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`

        // Trigger download
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        log.business.info('Screenshot saved successfully', {
          operation: 'chart_instance',
          action: 'take_screenshot',
          filename:
            filename || `chart-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`,
        })
        return dataURL
      } catch (error: unknown) {
        log.business.error('Screenshot failed', error as Error, {
          operation: 'chart_instance',
          action: 'take_screenshot',
        })
        return null
      }
    },
    [getEChartsInstance]
  )

  return {
    chartRef,
    chartReady,
    onChartReady,
    getEChartsInstance,
    convertPixelToData,
    convertDataToPixel,
    takeScreenshot,
  }
}

export default useChartInstance
