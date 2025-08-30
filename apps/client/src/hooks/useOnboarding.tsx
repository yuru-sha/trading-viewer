import { useState, useEffect } from 'react'
import { Icon } from '@trading-viewer/ui'
import { OnboardingStep } from '../components/Onboarding'

export interface OnboardingConfig {
  key: string
  version?: number
  autoStart?: boolean
  showOnFirstVisit?: boolean
}

/**
 * Onboarding Management Hook
 * - Tracks completion status across browser sessions
 * - Version management for updated onboarding flows
 * - Auto-start functionality
 * - Skip and completion handlers
 */
export const useOnboarding = (steps: OnboardingStep[], config: OnboardingConfig) => {
  const { key, version = 1, autoStart = false, showOnFirstVisit = true } = config

  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const storageKey = `onboarding_${key}_v${version}`
  const visitedKey = `onboarding_visited_${key}`

  const isCompleted = () => {
    try {
      return localStorage.getItem(storageKey) === 'completed'
    } catch {
      return false
    }
  }

  const hasVisited = () => {
    try {
      return localStorage.getItem(visitedKey) === 'true'
    } catch {
      return false
    }
  }

  const markVisited = () => {
    try {
      localStorage.setItem(visitedKey, 'true')
    } catch {
      // Ignore localStorage errors
    }
  }

  const markCompleted = () => {
    try {
      localStorage.setItem(storageKey, 'completed')
    } catch {
      // Ignore localStorage errors
    }
  }

  const markSkipped = () => {
    try {
      localStorage.setItem(storageKey, 'skipped')
    } catch {
      // Ignore localStorage errors
    }
  }

  const reset = () => {
    try {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(visitedKey)
    } catch {
      // Ignore localStorage errors
    }
  }

  const start = () => {
    setCurrentStepIndex(0)
    setIsActive(true)
    markVisited()
  }

  const complete = () => {
    setIsActive(false)
    markCompleted()
  }

  const skip = () => {
    setIsActive(false)
    markSkipped()
  }

  const handleStepChange = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex)
  }

  // Auto-start logic
  useEffect(() => {
    if (autoStart && !isCompleted()) {
      if (showOnFirstVisit && !hasVisited()) {
        // Start immediately on first visit
        start()
      } else if (!showOnFirstVisit) {
        // Start regardless of visit status
        start()
      }
    }
  }, [autoStart, showOnFirstVisit])

  return {
    // State
    isActive,
    currentStepIndex,
    steps,

    // Status
    isCompleted: isCompleted(),
    hasVisited: hasVisited(),

    // Actions
    start,
    complete,
    skip,
    reset,
    handleStepChange,

    // Computed
    canStart: steps.length > 0 && !isActive,
    progress: steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0,
    currentStep: steps[currentStepIndex],
  }
}

// Predefined onboarding flows
export const createTradingViewerOnboarding = (): OnboardingStep[] => [
  {
    id: 'welcome',
    title: 'Welcome to TradingViewer!',
    content: (
      <div>
        <p className='mb-3'>
          TradingViewer is your comprehensive trading analysis platform. Let&apos;s take a quick
          tour to get you started.
        </p>
        <div className='bg-blue-50 dark:bg-blue-900 p-3 rounded-md text-xs'>
          <Icon name='Lightbulb' className='w-4 h-4 inline mr-1' />
          <strong>Tip:</strong> You can skip this tour at any time by pressing ESC or clicking the X
          button.
        </div>
      </div>
    ),
    target: 'body',
    placement: 'center',
  },
  {
    id: 'navigation',
    title: 'Navigation Menu',
    content: (
      <div>
        <p className='mb-2'>Use the main navigation to access different sections:</p>
        <ul className='text-xs space-y-1 list-disc list-inside'>
          <li>
            <strong>Dashboard:</strong> Overview of your portfolio
          </li>
          <li>
            <strong>Charts:</strong> Advanced trading charts
          </li>
          <li>
            <strong>Search:</strong> Find stocks and symbols
          </li>
          <li>
            <strong>Watchlist:</strong> Track your favorite symbols
          </li>
        </ul>
      </div>
    ),
    target: '#main-navigation, nav[role="navigation"]',
    placement: 'bottom',
  },
  {
    id: 'theme-toggle',
    title: 'Theme Toggle',
    content: (
      <div>
        <p>Toggle between light and dark themes to customize your viewing experience.</p>
      </div>
    ),
    target: 'button[aria-label*="theme"]',
    placement: 'bottom',
    action: {
      label: 'Try it now!',
      onClick: () => {
        const themeButton = document.querySelector(
          'button[aria-label*="theme"]'
        ) as HTMLButtonElement
        themeButton?.click()
      },
    },
  },
  {
    id: 'search',
    title: 'Symbol Search',
    content: (
      <div>
        <p className='mb-2'>
          Search for stocks, ETFs, and other financial instruments to start analyzing.
        </p>
        <p className='text-xs text-gray-600 dark:text-gray-400'>
          Try searching for popular symbols like AAPL, TSLA, or SPY.
        </p>
      </div>
    ),
    target: 'a[href="/search"]',
    placement: 'bottom',
  },
  {
    id: 'mobile-features',
    title: 'Mobile-Friendly',
    content: (
      <div>
        <p className='mb-2'>TradingViewer is fully optimized for mobile devices with:</p>
        <ul className='text-xs space-y-1 list-disc list-inside'>
          <li>Touch-friendly charts with pinch-to-zoom</li>
          <li>Swipe navigation between timeframes</li>
          <li>Bottom navigation bar for quick access</li>
          <li>Responsive design for all screen sizes</li>
        </ul>
      </div>
    ),
    target: 'nav[aria-label="Bottom navigation"]',
    placement: 'top',
  },
  {
    id: 'complete',
    title: 'You&apos;re all set!',
    content: (
      <div>
        <p className='mb-3'>🎉 Congratulations! You&apos;ve completed the TradingViewer tour.</p>
        <div className='bg-green-50 dark:bg-green-900 p-3 rounded-md text-xs'>
          <strong>Next steps:</strong>
          <ul className='list-disc list-inside mt-2 space-y-1'>
            <li>Search for your favorite stocks</li>
            <li>Create a personalized watchlist</li>
            <li>Explore advanced chart features</li>
          </ul>
        </div>
      </div>
    ),
    target: 'body',
    placement: 'center',
  },
]

export default useOnboarding
