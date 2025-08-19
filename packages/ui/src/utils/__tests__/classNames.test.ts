import { describe, it, expect } from 'vitest'
import { cn } from '../classNames'

describe('cn (classNames utility)', () => {
  it('joins string classes correctly', () => {
    const result = cn('class1', 'class2', 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('filters out falsy values', () => {
    const result = cn('class1', null, 'class2', undefined, 'class3', false, '')
    expect(result).toBe('class1 class2 class3')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles only falsy values', () => {
    const result = cn(null, undefined, false, '')
    expect(result).toBe('')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class',
      'another-class'
    )
    expect(result).toBe('base-class active-class another-class')
  })

  it('deduplicates classes', () => {
    // Note: This function doesn't deduplicate, but tests current behavior
    const result = cn('class1', 'class2', 'class1')
    expect(result).toBe('class1 class2 class1')
  })
})
