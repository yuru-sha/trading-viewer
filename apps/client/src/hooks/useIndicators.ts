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
import { log } from '../services/logger'

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
    } catch {
      log.business.warn('Failed to get CSRF token for indicators fetch')
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.business.error('Failed to fetch indicators', new Error(errorText), {
        operation: 'fetch_indicators',
        httpStatus: response.status,
        symbol,
        timeframe,
      })
      throw new Error('Failed to fetch indicators')
    }

    const data = await response.json()
    if (data.data && data.data.length > 0) {
      log.business.info('Successfully fetched indicators', {
        operation: 'fetch_indicators',
        count: data.data.length,
        symbol,
        timeframe,
      })
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
  log.business.info('Creating new indicator', {
    operation: 'create_indicator',
    indicatorType: indicator.type,
    symbol: indicator.symbol,
    name: indicator.name,
  })

  const response = await fetch(`${API_BASE}/indicators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(indicator),
  })

  log.business.info('Received response from create indicator API', {
    operation: 'create_indicator',
    httpStatus: response.status,
    success: response.ok,
  })

  if (!response.ok) {
    const error = await response.json()
    log.business.error('Failed to create indicator', new Error(error.error), {
      operation: 'create_indicator',
      httpStatus: response.status,
      indicatorType: indicator.type,
    })
    throw new Error(error.error || 'Failed to create indicator')
  }

  const data = await response.json()
  log.business.info('Successfully created indicator', {
    operation: 'create_indicator',
    indicatorId: data.data?.id,
    indicatorName: data.data?.name,
  })
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
  log.business.info('Calculating indicator', {
    operation: 'calculate_indicator',
    indicatorType: request.type,
    symbol: request.symbol,
  })

  const response = await fetch(`${API_BASE}/indicators/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  })

  log.business.info('Received response from calculate indicator API', {
    operation: 'calculate_indicator',
    httpStatus: response.status,
    success: response.ok,
  })

  if (!response.ok) {
    const error = await response.json()
    log.business.error('Failed to calculate indicator', new Error(error.error), {
      operation: 'calculate_indicator',
      httpStatus: response.status,
      indicatorType: request.type,
    })
    throw new Error(error.error || 'Failed to calculate indicator')
  }

  const data = await response.json()
  log.business.info('Successfully calculated indicator', {
    operation: 'calculate_indicator',
    indicatorType: request.type,
    dataLength: data.data?.values?.length,
  })
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
    log.business.info('Successfully loaded indicators in hook', {
      operation: 'use_indicators',
      count: query.data.length,
      symbol,
      timeframe,
    })
  } else if (query.isError) {
    log.business.error('Failed to load indicators in hook', query.error as Error, {
      operation: 'use_indicators',
      symbol,
      timeframe,
    })
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
      log.business.info('Indicator created successfully in hook', {
        operation: 'use_create_indicator',
        indicatorId: data.id,
        symbol: data.symbol,
      })

      // Invalidate all indicator queries to ensure proper cache invalidation across timeframes
      queryClient.invalidateQueries({ queryKey: ['indicators'] })

      log.business.info('Invalidated indicator queries after creation', {
        operation: 'use_create_indicator',
        symbol: data.symbol,
      })
    },
    onError: error => {
      log.business.error('Failed to create indicator in hook', error as Error, {
        operation: 'use_create_indicator',
      })
    },
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
      queryClient.invalidateQueries({
        queryKey: ['indicators', variables.symbol, variables.timeframe],
      })
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
    parameters: Record<string, unknown>,
    options?: {
      name?: string
      visible?: boolean
      style?: Record<string, unknown>
    }
  ) => {
    log.business.info('Starting to add indicator', {
      operation: 'add_indicator',
      type,
      symbol,
      parameters,
      options,
    })

    try {
      // First calculate to validate parameters
      log.business.info('Validating indicator parameters', {
        operation: 'add_indicator',
        step: 'calculate',
      })
      const calculation = await calculateMutation.mutateAsync({
        symbol,
        type,
        parameters,
      })
      log.business.info('Indicator calculation successful', {
        operation: 'add_indicator',
        step: 'calculate',
        dataLength: calculation.values?.length,
      })

      // If calculation succeeds, create the indicator
      log.business.info('Creating validated indicator', {
        operation: 'add_indicator',
        step: 'create',
      })
      const indicator = await createMutation.mutateAsync({
        symbol,
        timeframe,
        type,
        name: options?.name || `${type.toUpperCase()}_${Date.now()}`,
        parameters,
        visible: options?.visible ?? true,
        ...(options?.style !== undefined && { style: options.style }),
      })
      log.business.info('Indicator creation successful', {
        operation: 'add_indicator',
        step: 'create',
        indicatorId: indicator.id,
      })

      return { indicator, calculation }
    } catch (error) {
      log.business.error('Failed to add indicator', error as Error, {
        operation: 'add_indicator',
        type,
        symbol,
      })
      throw new Error('Operation failed')
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
