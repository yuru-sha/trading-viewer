import { useState } from 'react'

export interface UseLoadingReturn {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

export const useLoading = (initialLoading = false): UseLoadingReturn => {
  const [isLoading, setIsLoading] = useState(initialLoading)

  const startLoading = () => setIsLoading(true)
  const stopLoading = () => setIsLoading(false)

  return {
    isLoading,
    startLoading,
    stopLoading,
  }
}

export default useLoading
