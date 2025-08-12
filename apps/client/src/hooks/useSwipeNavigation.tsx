import { useRef, useCallback, useEffect } from 'react'

interface SwipeConfig {
  threshold: number // Minimum distance for swipe
  restraint: number // Maximum distance perpendicular to swipe direction
  allowedTime: number // Maximum time for gesture
}

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

const defaultConfig: SwipeConfig = {
  threshold: 150,
  restraint: 100,
  allowedTime: 300,
}

export const useSwipeNavigation = (handlers: SwipeHandlers, config: Partial<SwipeConfig> = {}) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const swipeConfig = { ...defaultConfig, ...config }

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const touchEnd = e.changedTouches[0]
      const touchStart = touchStartRef.current

      if (!touchStart) return

      const distX = touchEnd.clientX - touchStart.x
      const distY = touchEnd.clientY - touchStart.y
      const elapsedTime = Date.now() - touchStart.time

      // Check if gesture meets time requirement
      if (elapsedTime > swipeConfig.allowedTime) return

      const absDistX = Math.abs(distX)
      const absDistY = Math.abs(distY)

      // Horizontal swipe
      if (absDistX >= swipeConfig.threshold && absDistY <= swipeConfig.restraint) {
        if (distX < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft()
          e.preventDefault()
        } else if (distX > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight()
          e.preventDefault()
        }
      }
      // Vertical swipe
      else if (absDistY >= swipeConfig.threshold && absDistX <= swipeConfig.restraint) {
        if (distY < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp()
          e.preventDefault()
        } else if (distY > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown()
          e.preventDefault()
        }
      }

      touchStartRef.current = null
    },
    [handlers, swipeConfig]
  )

  const attachSwipeListeners = useCallback(
    (element: HTMLElement) => {
      element.addEventListener('touchstart', handleTouchStart, { passive: false })
      element.addEventListener('touchend', handleTouchEnd, { passive: false })

      return () => {
        element.removeEventListener('touchstart', handleTouchStart)
        element.removeEventListener('touchend', handleTouchEnd)
      }
    },
    [handleTouchStart, handleTouchEnd]
  )

  return attachSwipeListeners
}

// Hook for swipe navigation between pages
export const usePageSwipeNavigation = (
  onPrevious?: () => void,
  onNext?: () => void,
  enabled: boolean = true
) => {
  const swipeHandlers = {
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
  }

  const attachSwipeListeners = useSwipeNavigation(enabled ? swipeHandlers : {}, {
    threshold: 100,
    restraint: 150,
  })

  useEffect(() => {
    if (!enabled) return

    const cleanup = attachSwipeListeners(document.body)
    return cleanup
  }, [attachSwipeListeners, enabled])

  return attachSwipeListeners
}

export default useSwipeNavigation
