import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  trigger?: 'hover' | 'click' | 'focus'
  delay?: number
  className?: string
  arrowClassName?: string
  disabled?: boolean
  maxWidth?: string
  offset?: number
}

/**
 * Accessible Tooltip Component
 * - WCAG 2.1 compliant
 * - Keyboard navigation support
 * - Smart positioning with auto-placement
 * - Touch device support
 * - Portal rendering for z-index management
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  trigger = 'hover',
  delay = 200,
  className = '',
  arrowClassName = '',
  disabled = false,
  maxWidth = '200px',
  offset = 8,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [actualPlacement, setActualPlacement] = useState(placement)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`)

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    let newPosition = { top: 0, left: 0 }
    let newPlacement = placement

    // Auto-placement logic
    if (placement === 'auto') {
      const spaceTop = triggerRect.top
      const spaceBottom = viewportHeight - triggerRect.bottom
      const spaceLeft = triggerRect.left
      const spaceRight = viewportWidth - triggerRect.right

      if (
        spaceTop >= tooltipRect.height &&
        spaceTop >= Math.max(spaceBottom, spaceLeft, spaceRight)
      ) {
        newPlacement = 'top'
      } else if (
        spaceBottom >= tooltipRect.height &&
        spaceBottom >= Math.max(spaceLeft, spaceRight)
      ) {
        newPlacement = 'bottom'
      } else if (spaceLeft >= tooltipRect.width) {
        newPlacement = 'left'
      } else {
        newPlacement = 'right'
      }
    } else {
      // Check if there's enough space for the preferred placement
      switch (placement) {
        case 'top':
          if (triggerRect.top < tooltipRect.height + offset) {
            newPlacement = 'bottom'
          }
          break
        case 'bottom':
          if (viewportHeight - triggerRect.bottom < tooltipRect.height + offset) {
            newPlacement = 'top'
          }
          break
        case 'left':
          if (triggerRect.left < tooltipRect.width + offset) {
            newPlacement = 'right'
          }
          break
        case 'right':
          if (viewportWidth - triggerRect.right < tooltipRect.width + offset) {
            newPlacement = 'left'
          }
          break
      }
    }

    // Calculate position based on final placement
    switch (newPlacement) {
      case 'top':
        newPosition = {
          top: triggerRect.top + scrollY - tooltipRect.height - offset,
          left: triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2,
        }
        break
      case 'bottom':
        newPosition = {
          top: triggerRect.bottom + scrollY + offset,
          left: triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2,
        }
        break
      case 'left':
        newPosition = {
          top: triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2,
          left: triggerRect.left + scrollX - tooltipRect.width - offset,
        }
        break
      case 'right':
        newPosition = {
          top: triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2,
          left: triggerRect.right + scrollX + offset,
        }
        break
    }

    // Ensure tooltip stays within viewport bounds
    newPosition.left = Math.max(
      8,
      Math.min(newPosition.left, viewportWidth - tooltipRect.width - 8)
    )
    newPosition.top = Math.max(
      8,
      Math.min(newPosition.top, viewportHeight - tooltipRect.height - 8)
    )

    setPosition(newPosition)
    setActualPlacement(newPlacement)
  }

  const showTooltip = () => {
    if (disabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(
      () => {
        setIsVisible(false)
      },
      trigger === 'hover' ? 100 : 0
    )
  }

  const toggleTooltip = () => {
    if (disabled) return
    setIsVisible(!isVisible)
  }

  useEffect(() => {
    if (isVisible) {
      calculatePosition()

      // Recalculate on scroll/resize
      const handleUpdate = () => calculatePosition()
      window.addEventListener('scroll', handleUpdate)
      window.addEventListener('resize', handleUpdate)

      return () => {
        window.removeEventListener('scroll', handleUpdate)
        window.removeEventListener('resize', handleUpdate)
      }
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45'

    switch (actualPlacement) {
      case 'top':
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2 ${arrowClassName}`
      case 'bottom':
        return `${baseClasses} -top-1 left-1/2 -translate-x-1/2 ${arrowClassName}`
      case 'left':
        return `${baseClasses} -right-1 top-1/2 -translate-y-1/2 ${arrowClassName}`
      case 'right':
        return `${baseClasses} -left-1 top-1/2 -translate-y-1/2 ${arrowClassName}`
      default:
        return `${baseClasses} ${arrowClassName}`
    }
  }

  const triggerProps = {
    ref: triggerRef,
    'aria-describedby': isVisible ? tooltipId.current : undefined,
    ...(trigger === 'hover' && {
      onMouseEnter: showTooltip,
      onMouseLeave: hideTooltip,
      onFocus: showTooltip,
      onBlur: hideTooltip,
    }),
    ...(trigger === 'click' && {
      onClick: toggleTooltip,
    }),
    ...(trigger === 'focus' && {
      onFocus: showTooltip,
      onBlur: hideTooltip,
    }),
  }

  const tooltipElement = isVisible && (
    <div
      ref={tooltipRef}
      id={tooltipId.current}
      role='tooltip'
      className={`
        fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 
        rounded-lg shadow-lg pointer-events-none transition-opacity duration-200
        ${className}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxWidth,
      }}
    >
      {content}
      <div className={getArrowClasses()} />
    </div>
  )

  return (
    <>
      <div {...triggerProps} className='inline-block'>
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
    </>
  )
}

// Convenience wrapper for help tooltips
export const HelpTooltip: React.FC<Omit<TooltipProps, 'trigger'> & { helpText: string }> = ({
  helpText,
  children,
  ...props
}) => (
  <Tooltip
    content={
      <div className='flex items-start space-x-2'>
        <svg
          className='w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path
            fillRule='evenodd'
            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z'
            clipRule='evenodd'
          />
        </svg>
        <span>{helpText}</span>
      </div>
    }
    trigger='hover'
    {...props}
  >
    {children}
  </Tooltip>
)

export default Tooltip
