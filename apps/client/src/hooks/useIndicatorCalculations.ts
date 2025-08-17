import { useQuery } from '@tanstack/react-query'
import { UserIndicator, IndicatorResult } from '@trading-viewer/shared'

const API_BASE = '/api'

// インジケーター計算結果を取得する関数
const fetchIndicatorCalculation = async (
  symbol: string,
  type: string,
  parameters: Record<string, any>
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

// インジケーター計算結果を取得するフック
export const useIndicatorCalculation = (
  symbol: string,
  indicator: UserIndicator,
  enabled: boolean = true
) => {
  // Safe parameter access
  const parameters = indicator?.parameters || {}
  const indicatorType = indicator?.type || 'unknown'
  const safeSymbol = symbol || 'unknown'
  const isValidIndicator = indicator && indicator.type && symbol

  console.log('🔍 useIndicatorCalculation - useQuery setup:', {
    safeSymbol,
    indicatorType,
    enabled: enabled && !!symbol && isValidIndicator,
    hasSymbol: !!symbol,
    isValidIndicator,
    parameters,
  })

  return useQuery({
    queryKey: ['indicator-calculation', safeSymbol, indicatorType, JSON.stringify(parameters)],
    queryFn: () => {
      console.log('🔍 fetchIndicatorCalculation called:', {
        symbol,
        type: indicator.type,
        parameters,
      })
      return fetchIndicatorCalculation(symbol, indicator.type, parameters)
    },
    enabled: enabled && !!symbol && isValidIndicator,
    staleTime: 5 * 60 * 1000, // 5 分間キャッシュ
    retry: 1,
  })
}

// 複数のインジケーター計算結果を取得するフック
export const useIndicatorCalculations = (symbol: string, indicators: UserIndicator[]) => {
  // Safe indicators array access
  const safeIndicators = Array.isArray(indicators) ? indicators : []

  console.log('🔍 useIndicatorCalculations called:', {
    symbol,
    indicatorsCount: indicators?.length || 0,
    safeIndicatorsCount: safeIndicators?.length || 0,
    indicators: safeIndicators.map(i => ({
      id: i?.id,
      type: i?.type,
      name: i?.name,
      visible: i?.visible,
      parameters: i?.parameters,
    })),
  })

  // React Hook rules: 常に同じ数の Hook を呼び出す必要がある
  // 最大 10 個のインジケーターをサポート（必要に応じて調整可能）
  const MAX_INDICATORS = 10
  const paddedIndicators = [...safeIndicators]
  while (paddedIndicators.length < MAX_INDICATORS) {
    paddedIndicators.push(null)
  }

  // 常に固定数の Hook を呼び出す
  const allCalculations = paddedIndicators.slice(0, MAX_INDICATORS).map((indicator, index) => {
    const isValidIndicator = indicator && indicator.type && indicator.id
    const enabled = isValidIndicator && (indicator?.visible ?? false)

    if (isValidIndicator) {
      console.log('🔍 Creating calculation for indicator:', {
        id: indicator.id,
        type: indicator.type,
        name: indicator.name,
        visible: indicator.visible,
        enabled,
      })
    }

    return useIndicatorCalculation(
      symbol,
      indicator || {
        id: `placeholder-${index}`,
        type: 'sma',
        name: '',
        parameters: {},
        visible: false,
      },
      enabled
    )
  })

  // 有効な計算結果のみをフィルター
  const validCalculations = allCalculations.slice(0, safeIndicators.length)

  return {
    calculations: validCalculations,
    isLoading:
      validCalculations.length > 0 ? validCalculations.some(calc => calc.isLoading) : false,
    hasError: validCalculations.length > 0 ? validCalculations.some(calc => calc.error) : false,
    data: validCalculations.reduce(
      (acc, calc, index) => {
        const indicator = safeIndicators[index]
        if (calc.data && indicator?.id) {
          acc[indicator.id] = calc.data
        }
        return acc
      },
      {} as Record<string, IndicatorResult>
    ),
  }
}
