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
const createFetchIndicators = (getCSRFToken: () => Promise<string>) => 
  async (symbol?: string): Promise<UserIndicator[]> => {
    let url = `${API_BASE}/indicators`
    if (symbol) {
      url += `?symbol=${encodeURIComponent(symbol)}`
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add CSRF token for authentication
    try {
      const csrfToken = await getCSRFToken()
      headers['x-csrf-token'] = csrfToken
    } catch (error) {
      console.warn('Failed to get CSRF token:', error)
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    })

    if (!response.ok) {
      throw new Error('Failed to fetch indicators')
    }

    const data = await response.json()
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
  const response = await fetch(`${API_BASE}/indicators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(indicator),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create indicator')
  }

  const data = await response.json()
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
  const response = await fetch(`${API_BASE}/indicators/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to calculate indicator')
  }

  const data = await response.json()
  return data.data
}

const updateIndicatorPositions = async ({
  symbol,
  positions,
}: {
  symbol: string
  positions: UpdatePositionsRequest['positions']
}): Promise<void> => {
  const url = new URL(`${API_BASE}/indicators/positions`, window.location.origin)
  url.searchParams.set('symbol', symbol)

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
export const useIndicators = (symbol?: string) => {
  const { getCSRFToken } = useAuth()
  
  return useQuery({
    queryKey: ['indicators', symbol],
    queryFn: () => createFetchIndicators(getCSRFToken)(symbol),
    staleTime: 30000, // 30 seconds
  })
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
    onSuccess: (data) => {
      // Invalidate both general and symbol-specific indicator queries
      queryClient.invalidateQueries({ queryKey: ['indicators'] })
      // Also invalidate the specific symbol query
      queryClient.invalidateQueries({ queryKey: ['indicators', data.symbol] })
    },
  })
}

export const useUpdateIndicator = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateIndicator,
    onSuccess: (data) => {
      // Update the specific indicator in cache
      queryClient.setQueryData(['indicators', data.id], data)
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['indicators'] })
      queryClient.invalidateQueries({ queryKey: ['indicators', data.symbol] })
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
      // Invalidate symbol-specific indicators
      queryClient.invalidateQueries({ queryKey: ['indicators', variables.symbol] })
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
    parameters: Record<string, any>,
    options?: {
      name?: string
      visible?: boolean
      style?: Record<string, any>
    }
  ) => {
    // First calculate to validate parameters
    const calculation = await calculateMutation.mutateAsync({
      symbol,
      type,
      parameters,
    })

    // If calculation succeeds, create the indicator
    const indicator = await createMutation.mutateAsync({
      symbol,
      type,
      name: options?.name || `${type.toUpperCase()}_${Date.now()}`,
      parameters,
      visible: options?.visible ?? true,
      style: options?.style,
    })

    return { indicator, calculation }
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