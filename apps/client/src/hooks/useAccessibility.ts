import { useEffect, useRef, useCallback, useState } from 'react'

// WCAG 2.1 AA 準拠のアクセシビリティフック

export interface AccessibilityOptions {
  announcePageChanges?: boolean
  focusManagement?: boolean
  reducedMotion?: boolean
  highContrast?: boolean
}

export interface UseAccessibilityResult {
  // Screen Reader announcements
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void

  // Focus management
  focusElement: (element: HTMLElement | null) => void
  trapFocus: (container: HTMLElement, isActive: boolean) => void

  // Motion preferences
  prefersReducedMotion: boolean

  // High contrast detection
  prefersHighContrast: boolean

  // Skip links
  skipLinkRef: React.MutableRefObject<HTMLAnchorElement | null>

  // Live region for announcements
  liveRegionRef: React.MutableRefObject<HTMLDivElement | null>
}

export const useAccessibility = (options: AccessibilityOptions = {}): UseAccessibilityResult => {
  const {
    focusManagement = true,
    reducedMotion = true,
    highContrast = true,
  } = options

  const liveRegionRef = useRef<HTMLDivElement | null>(null)
  const skipLinkRef = useRef<HTMLAnchorElement>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  // Initialize live region for screen reader announcements
  useEffect(() => {
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.setAttribute('role', 'status')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
      liveRegionRef.current = liveRegion
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current)
      }
    }
  }, [])

  // Detect user preferences
  useEffect(() => {
    if (reducedMotion) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [reducedMotion])

  useEffect(() => {
    if (highContrast) {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)')
      setPrefersHighContrast(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [highContrast])

  // Screen reader announcements
  const announceToScreenReader = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (liveRegionRef.current) {
        liveRegionRef.current.setAttribute('aria-live', priority)
        liveRegionRef.current.textContent = message

        // Clear after announcement to avoid repeated readings
        setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = ''
          }
        }, 1000)
      }
    },
    []
  )

  // Focus management
  const focusElement = useCallback(
    (element: HTMLElement | null) => {
      if (element && focusManagement) {
        // Store current focus for potential restoration
        lastFocusRef.current = document.activeElement as HTMLElement

        // Ensure element is focusable
        if (!element.hasAttribute('tabindex')) {
          element.setAttribute('tabindex', '-1')
        }

        element.focus()
      }
    },
    [focusManagement]
  )

  const trapFocus = useCallback(
    (container: HTMLElement, isActive: boolean) => {
      if (!focusManagement) return

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>

      if (!focusableElements.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              e.preventDefault()
              lastElement.focus()
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement.focus()
            }
          }
        }

        // Escape key to close modals/dialogs
        if (e.key === 'Escape') {
          const closeButton = container.querySelector(
            '[aria-label*="close"], [aria-label*="Close"]'
          ) as HTMLElement
          if (closeButton) {
            closeButton.click()
          }
        }
      }

      if (isActive) {
        container.addEventListener('keydown', handleKeyDown)
        firstElement.focus()
      } else {
        container.removeEventListener('keydown', handleKeyDown)
        // Restore focus to previous element
        if (lastFocusRef.current) {
          lastFocusRef.current.focus()
        }
      }

      return () => {
        container.removeEventListener('keydown', handleKeyDown)
      }
    },
    [focusManagement]
  )

  return {
    announceToScreenReader,
    focusElement,
    trapFocus,
    prefersReducedMotion,
    prefersHighContrast,
    skipLinkRef,
    liveRegionRef,
  }
}

// WCAG 2.1 色コントラスト計算ユーティリティ
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    if (!rgb) return 0

    const r = parseInt(rgb[1], 16) / 255
    const g = parseInt(rgb[2], 16) / 255
    const b = parseInt(rgb[3], 16) / 255

    const sRGB = [r, g, b].map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

// WCAG 2.1 準拠チェック
export const isWCAGCompliant = (contrastRatio: number, level: 'AA' | 'AAA' = 'AA'): boolean => {
  return level === 'AA' ? contrastRatio >= 4.5 : contrastRatio >= 7
}

// キーボードナビゲーション用ユーティリティ
export const getNavigableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([aria-disabled="true"])',
    '[role="link"]:not([aria-disabled="true"])',
    '[role="menuitem"]:not([aria-disabled="true"])',
    '[role="tab"]:not([aria-disabled="true"])',
  ].join(', ')

  return Array.from(container.querySelectorAll(selector))
}

// Arrow key navigation
export const useArrowKeyNavigation = (
  containerRef: React.RefObject<HTMLElement>,
  orientation: 'horizontal' | 'vertical' | 'grid' = 'horizontal'
) => {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const elements = getNavigableElements(container)
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement)

      if (currentIndex === -1) return

      let nextIndex = currentIndex

      switch (e.key) {
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = (currentIndex + 1) % elements.length
          }
          break
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1
          }
          break
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = (currentIndex + 1) % elements.length
          }
          break
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1
          }
          break
        case 'Home':
          e.preventDefault()
          nextIndex = 0
          break
        case 'End':
          e.preventDefault()
          nextIndex = elements.length - 1
          break
      }

      if (nextIndex !== currentIndex && elements[nextIndex]) {
        elements[nextIndex].focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, orientation])
}
