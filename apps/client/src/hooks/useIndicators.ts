import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IndicatorType,
  UserIndicator,
  CreateIndicatorRequest,
  UpdateIndicatorRequest,
  CalculateIndicatorRequest,
  UpdatePositionsRequest,
  IndicatorResult,
} from '@trading-viewer/shared'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = '/api'

// API functions
const createFetchIndicators =
  (getCSRFToken: () => Promise<string>) =>
  async (symbol?: string, timeframe?: string): Promise<UserIndicator[]> => {
    let url = `${API_BASE}/indicators`
    const params = new URLSearchParams()
    if (symbol) params.append('symbol', symbol)
    if (timeframe) params.append('timeframe', timeframe)
    if (params.toString()) {
      url += `?${params.toString()}`
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add CSRF token for authentication
    try {
      const csrfToken = await getCSRFToken()
      headers['x-csrf-token'] = csrfToken
    } catch (error) {
      console.warn('⚠️ createFetchIndicators: Failed to get CSRF token:', error)
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ createFetchIndicators: Error response:', response.status, errorText)
      throw new Error('Failed to fetch indicators')
    }

    const data = await response.json()
    if (data.data && data.data.length > 0) {
      console.log('✅ createFetchIndicators: Found', data.data.length, 'indicators for', symbol)
    }
    return data.data || []
  }

const fetchIndicator = async (id: string): Promise<UserIndicator> => {
  const response = await fetch(`${API_BASE}/indicators/${id}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch indicator')
  }

  const data = await response.json()
  return data.data
}

const createIndicator = async (indicator: CreateIndicatorRequest): Promise<UserIndicator> => {
  console.log('🔍 createIndicator: Making API request:', {
    url: `${API_BASE}/indicators`,
    method: 'POST',
    body: indicator,
  })

  const response = await fetch(`${API_BASE}/indicators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(indicator),
  })

  console.log('🔍 createIndicator: Response received:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ createIndicator: API error:', error)
    throw new Error(error.error || 'Failed to create indicator')
  }

  const data = await response.json()
  console.log('✅ createIndicator: Success:', data)
  return data.data
}

const updateIndicator = async ({
  id,
  updates,
}: {
  id: string
  updates: UpdateIndicatorRequest
}): Promise<UserIndicator> => {
  const response = await fetch(`${API_BASE}/indicators/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update indicator')
  }

  const data = await response.json()
  return data.data
}

const deleteIndicator = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/indicators/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete indicator')
  }
}

const calculateIndicator = async (request: CalculateIndicatorRequest): Promise<IndicatorResult> => {
  console.log('🔍 calculateIndicator: Making API request:', {
    url: `${API_BASE}/indicators/calculate`,
    method: 'POST',
    body: request,
  })

  const response = await fetch(`${API_BASE}/indicators/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  })

  console.log('🔍 calculateIndicator: Response received:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ calculateIndicator: API error:', error)
    throw new Error(error.error || 'Failed to calculate indicator')
  }

  const data = await response.json()
  console.log('✅ calculateIndicator: Success:', data)
  return data.data
}

const updateIndicatorPositions = async ({
  symbol,
  timeframe = 'D',
  positions,
}: {
  symbol: string
  timeframe?: string
  positions: UpdatePositionsRequest['positions']
}): Promise<void> => {
  const url = new URL(`${API_BASE}/indicators/positions`, window.location.origin)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('timeframe', timeframe)

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ positions }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update indicator positions')
  }
}

// Custom hooks
export const useIndicators = (symbol?: string, timeframe?: string) => {
  const { getCSRFToken } = useAuth()

  const query = useQuery({
    queryKey: ['indicators', symbol, timeframe],
    queryFn: () => createFetchIndicators(getCSRFToken)(symbol, timeframe),
    staleTime: 30000, // 30 seconds
  })

  // Only log when there's actual data or errors
  if (query.data && query.data.length > 0) {
    console.log('📊 useIndicators found indicators:', query.data.length, 'for symbol:', symbol, 'timeframe:', timeframe)
  } else if (query.isError) {
    console.error('❌ useIndicators error for symbol:', symbol, 'timeframe:', timeframe, query.error)
  }

  return query
}

export const useIndicator = (id: string) => {
  return useQuery({
    queryKey: ['indicators', id],
    queryFn: () => fetchIndicator(id),
    enabled: !!id,
  })
}

export const useCreateIndicator = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createIndicator,
    onSuccess: data => {
      console.log('✅ useCreateIndicator: Indicator created successfully:', data)
      console.log('🔍 useCreateIndicator: Invalidating queries for symbol:', data.symbol)
      
      // Invalidate all indicator queries to ensure proper cache invalidation across timeframes
      queryClient.invalidateQueries({ queryKey: ['indicators'] })
      
      console.log('🔍 useCreateIndicator: Queries invalidated')
    },
    onError: error => {
      console.error('❌ useCreateIndicator: Error creating indicator:', error)
    }
  })
}

export const useUpdateIndicator = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateIndicator,
    onSuccess: data => {
      // Update the specific indicator in cache
      queryClient.setQueryData(['indicators', data.id], data)
      // Invalidate all indicator lists to ensure proper cache invalidation across timeframes
      queryClient.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

export const useDeleteIndicator = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteIndicator,
    onSuccess: () => {
      // Invalidate all indicator queries
      queryClient.invalidateQueries({ queryKey: ['indicators'] })
    },
  })
}

export const useCalculateIndicator = () => {
  return useMutation({
    mutationFn: calculateIndicator,
  })
}

export const useUpdateIndicatorPositions = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateIndicatorPositions,
    onSuccess: (_, variables) => {
      // Invalidate symbol and timeframe-specific indicators
      queryClient.invalidateQueries({ queryKey: ['indicators', variables.symbol, variables.timeframe] })
    },
  })
}

// Helper hooks for common operations
export const useAddIndicator = () => {
  const createMutation = useCreateIndicator()
  const calculateMutation = useCalculateIndicator()

  const addIndicator = async (
    type: IndicatorType,
    symbol: string,
    timeframe: string = 'D',
    parameters: Record<string, any>,
    options?: {
      name?: string
      visible?: boolean
      style?: Record<string, any>
    }
  ) => {
    console.log('🔍 useAddIndicator: Starting to add indicator:', {
      type,
      symbol,
      parameters,
      options,
    })

    try {
      // First calculate to validate parameters
      console.log('🔍 useAddIndicator: Calculating indicator...')
      const calculation = await calculateMutation.mutateAsync({
        symbol,
        type,
        parameters,
      })
      console.log('✅ useAddIndicator: Calculation successful:', calculation)

      // If calculation succeeds, create the indicator
      console.log('🔍 useAddIndicator: Creating indicator...')
      const indicator = await createMutation.mutateAsync({
        symbol,
        timeframe,
        type,
        name: options?.name || `${type.toUpperCase()}_${Date.now()}`,
        parameters,
        visible: options?.visible ?? true,
        style: options?.style,
      })
      console.log('✅ useAddIndicator: Creation successful:', indicator)

      return { indicator, calculation }
    } catch (error) {
      console.error('❌ useAddIndicator: Error occurred:', error)
      throw error
    }
  }

  return {
    addIndicator,
    isLoading: createMutation.isPending || calculateMutation.isPending,
    error: createMutation.error || calculateMutation.error,
  }
}

export const useToggleIndicator = () => {
  const updateMutation = useUpdateIndicator()

  const toggleIndicator = (id: string, visible: boolean) => {
    return updateMutation.mutateAsync({
      id,
      updates: { visible },
    })
  }

  return {
    toggleIndicator,
    isLoading: updateMutation.isPending,
    error: updateMutation.error,
  }
}
