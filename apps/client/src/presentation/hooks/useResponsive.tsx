import { useState, useEffect, useMemo } from 'react'

interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

interface ResponsiveState {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLandscape: boolean
  isPortrait: boolean
  breakpoint: keyof BreakpointConfig | 'xs'
}

export const useResponsive = (breakpoints: Partial<BreakpointConfig> = {}): ResponsiveState => {
  const bp = useMemo(() => ({ ...defaultBreakpoints, ...breakpoints }), [breakpoints])

  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: false,
        breakpoint: 'xs',
      }
    }

    return getResponsiveState(window.innerWidth, window.innerHeight, bp)
  })

  useEffect(() => {
    const handleResize = () => {
      setState(getResponsiveState(window.innerWidth, window.innerHeight, bp))
    }

    // Initial call
    handleResize()

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [bp])

  return state
}

const getResponsiveState = (
  width: number,
  height: number,
  breakpoints: BreakpointConfig
): ResponsiveState => {
  let breakpoint: keyof BreakpointConfig | 'xs' = 'xs'

  if (width >= breakpoints['2xl']) {
    breakpoint = '2xl'
  } else if (width >= breakpoints.xl) {
    breakpoint = 'xl'
  } else if (width >= breakpoints.lg) {
    breakpoint = 'lg'
  } else if (width >= breakpoints.md) {
    breakpoint = 'md'
  } else if (width >= breakpoints.sm) {
    breakpoint = 'sm'
  }

  const isMobile = width < breakpoints.md
  const isTablet = width >= breakpoints.md && width < breakpoints.lg
  const isDesktop = width >= breakpoints.lg
  const isLandscape = width > height
  const isPortrait = height > width

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    isPortrait,
    breakpoint,
  }
}

// Hook for device detection
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [hasHover, setHasHover] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      // Check for touch capability
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      setIsTouchDevice(touch)

      // Check for hover capability
      const hover = window.matchMedia('(hover: hover)').matches
      setHasHover(hover)

      // Determine device type
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType('mobile')
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { deviceType, isTouchDevice, hasHover }
}

// Hook for viewport detection (for intersection observer)
export const useViewportSize = () => {
  const [viewportSize, setViewportSize] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 }
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure orientation change is complete
      setTimeout(handleResize, 100)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return viewportSize
}

// Hook for safe area detection (iOS notch, etc.)
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  useEffect(() => {
    const updateSafeArea = () => {
      const style = getComputedStyle(document.documentElement)
      setSafeArea({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top')) || 0,
        right: parseInt(style.getPropertyValue('--safe-area-inset-right')) || 0,
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom')) || 0,
        left: parseInt(style.getPropertyValue('--safe-area-inset-left')) || 0,
      })
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    window.addEventListener('orientationchange', updateSafeArea)

    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return safeArea
}

export default useResponsive
