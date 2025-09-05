import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@trading-viewer/ui'

export interface OnboardingStep {
  id: string
  title: string
  content: React.ReactNode
  target: string // CSS selector
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: {
    label: string
    onClick: () => void
  }
  skipable?: boolean
}

export interface OnboardingProps {
  steps: OnboardingStep[]
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
  onStepChange?: (stepIndex: number) => void
  className?: string
}

/**
 * Interactive Onboarding Component
 * - Step-by-step guided tour
 * - Smart positioning around target elements
 * - Keyboard navigation support
 * - Progress tracking
 * - Skip functionality
 * - Mobile responsive
 */
export const Onboarding: React.FC<OnboardingProps> = ({
  steps,
  isActive,
  onComplete,
  onSkip,
  onStepChange,
  className = '',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const currentStep = steps[currentStepIndex]

  const calculatePosition = useCallback(() => {
    if (!currentStep || !modalRef.current) return

    const targetElement = document.querySelector(currentStep.target)
    if (!targetElement) return

    const rect = targetElement.getBoundingClientRect()
    const modalRect = modalRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    setTargetRect(rect)

    let newPosition = { top: 0, left: 0 }

    if (currentStep.placement === 'center') {
      newPosition = {
        top: (viewportHeight - modalRect.height) / 2 + scrollY,
        left: (viewportWidth - modalRect.width) / 2 + scrollX,
      }
    } else {
      const placement = currentStep.placement || 'bottom'
      const offset = 20

      switch (placement) {
        case 'top':
          newPosition = {
            top: rect.top + scrollY - modalRect.height - offset,
            left: rect.left + scrollX + (rect.width - modalRect.width) / 2,
          }
          break
        case 'bottom':
          newPosition = {
            top: rect.bottom + scrollY + offset,
            left: rect.left + scrollX + (rect.width - modalRect.width) / 2,
          }
          break
        case 'left':
          newPosition = {
            top: rect.top + scrollY + (rect.height - modalRect.height) / 2,
            left: rect.left + scrollX - modalRect.width - offset,
          }
          break
        case 'right':
          newPosition = {
            top: rect.top + scrollY + (rect.height - modalRect.height) / 2,
            left: rect.right + scrollX + offset,
          }
          break
      }

      // Ensure modal stays within viewport
      newPosition.left = Math.max(
        16,
        Math.min(newPosition.left, viewportWidth - modalRect.width - 16)
      )
      newPosition.top = Math.max(
        16,
        Math.min(newPosition.top, viewportHeight - modalRect.height - 16)
      )
    }

    setPosition(newPosition)
  }, [currentStep])

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1
      setCurrentStepIndex(nextIndex)
      onStepChange?.(nextIndex)
    } else {
      onComplete()
    }
  }, [currentStepIndex, onComplete, onStepChange, steps.length])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1
      setCurrentStepIndex(prevIndex)
      onStepChange?.(prevIndex)
    }
  }, [currentStepIndex, onStepChange])

  const goToStep = (index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index)
      onStepChange?.(index)
    }
  }

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive) return

      switch (event.key) {
        case 'Escape':
          onSkip()
          break
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          event.preventDefault()
          prevStep()
          break
      }
    },
    [isActive, nextStep, onSkip, prevStep]
  )

  const scrollToTarget = useCallback(() => {
    if (!currentStep) return

    const targetElement = document.querySelector(currentStep.target)
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
    }
  }, [currentStep])

  useEffect(() => {
    if (isActive && currentStep) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToTarget()
        calculatePosition()
      }, 100)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [isActive, currentStep, calculatePosition, scrollToTarget])

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      window.addEventListener('resize', calculatePosition)
      window.addEventListener('scroll', calculatePosition)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('resize', calculatePosition)
        window.removeEventListener('scroll', calculatePosition)
      }
    }
    return undefined
  }, [isActive, calculatePosition, handleKeyDown])

  if (!isActive || !currentStep) return null

  const progress = ((currentStepIndex + 1) / steps.length) * 100

  return createPortal(
    <div
      ref={overlayRef}
      className='fixed inset-0 z-[10000] pointer-events-auto'
      role='dialog'
      aria-modal='true'
      aria-labelledby='onboarding-title'
      aria-describedby='onboarding-content'
    >
      {/* Overlay with spotlight effect */}
      <div className='absolute inset-0 bg-black bg-opacity-60'>
        {targetRect && currentStep.placement !== 'center' && (
          <div
            className='absolute border-4 border-blue-400 rounded-lg shadow-xl pointer-events-none'
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: `
                0 0 0 4px rgba(59, 130, 246, 0.5),
                0 0 50px rgba(59, 130, 246, 0.3),
                inset 0 0 0 1000px rgba(0, 0, 0, 0.3)
              `,
            }}
          />
        )}
      </div>

      {/* Onboarding Modal */}
      <div
        ref={modalRef}
        className={`absolute bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4 ${className}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Progress Bar */}
        <div className='h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden'>
          <div
            className='h-full bg-blue-600 transition-all duration-300 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className='p-6'>
          <div className='flex items-start justify-between mb-4'>
            <h2
              id='onboarding-title'
              className='text-lg font-semibold text-gray-900 dark:text-white pr-4'
            >
              {currentStep.title}
            </h2>
            <button
              onClick={onSkip}
              className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0'
              aria-label='Skip onboarding'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          <div id='onboarding-content' className='text-sm text-gray-600 dark:text-gray-300 mb-6'>
            {currentStep.content}
          </div>

          {/* Step Action */}
          {currentStep.action && (
            <div className='mb-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={currentStep.action.onClick}
                disabled={false}
                className='w-full'
              >
                {currentStep.action.label}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {currentStepIndex + 1} of {steps.length}
              </span>

              {/* Step Dots */}
              <div className='flex space-x-1'>
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToStep(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStepIndex
                        ? 'bg-blue-600'
                        : index < currentStepIndex
                          ? 'bg-blue-300'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className='flex space-x-2'>
              {currentStepIndex > 0 && (
                <Button variant='ghost' size='sm' onClick={prevStep} disabled={false} className=''>
                  Previous
                </Button>
              )}

              <Button variant='primary' size='sm' onClick={nextStep} disabled={false} className=''>
                {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-75 pointer-events-none'>
        Use arrow keys to navigate • ESC to skip
      </div>
    </div>,
    document.body
  )
}

export default Onboarding
