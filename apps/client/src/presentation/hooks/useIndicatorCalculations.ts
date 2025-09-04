import { useQueries } from '@tanstack/react-query'
import { UserIndicator, IndicatorResult } from '@trading-viewer/shared'

const API_BASE = '/api'

// インジケーター計算結果を取得する関数
const fetchIndicatorCalculation = async (
  symbol: string,
  type: string,
  parameters: Record<string, unknown>
): Promise<IndicatorResult> => {
  const response = await fetch(`${API_BASE}/indicators/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      symbol,
      type,
      parameters,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to calculate indicator')
  }

  const data = await response.json()
  return data.data
}

// 複数のインジケーター計算結果を取得するフック
export const useIndicatorCalculations = (symbol: string, indicators: UserIndicator[]) => {
  const safeIndicators = Array.isArray(indicators) ? indicators : []

  const queries = safeIndicators.map(indicator => {
    const isValidIndicator = indicator && indicator.type && indicator.id
    const enabled = isValidIndicator && (indicator?.visible ?? false) && !!symbol
    const parameters = indicator?.parameters || {}
    const indicatorType = indicator?.type || 'unknown'
    const safeSymbol = symbol || 'unknown'

    return {
      queryKey: ['indicator-calculation', safeSymbol, indicatorType, JSON.stringify(parameters)],
      queryFn: () => fetchIndicatorCalculation(symbol, indicator.type, parameters),
      enabled: Boolean(enabled),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    }
  })

  const results = useQueries({ queries })

  return {
    calculations: results,
    isLoading: results.some(calc => calc.isLoading),
    hasError: results.some(calc => !!calc.error),
    data: results.reduce(
      (acc, result, index) => {
        const indicator = safeIndicators[index]
        if (result.data && indicator?.id) {
          acc[indicator.id] = result.data
        }
        return acc
      },
      {} as Record<string, IndicatorResult>
    ),
  }
}
