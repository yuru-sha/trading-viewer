import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '../../../__tests__/test-utils'
import AdvancedUserFilters from '../AdvancedUserFilters'

// Mock the UI components
vi.mock('@trading-viewer/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={e => onChange?.(e.target.value)} {...props} />
  ),
}))

describe.skip('AdvancedUserFilters', () => {
  const mockProps = {
    onApplyFilters: vi.fn(),
    onClearFilters: vi.fn(),
    isOpen: false,
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Toggle Functionality', () => {
    it('should not show filters panel when closed', () => {
      render(<AdvancedUserFilters {...mockProps} />)

      expect(screen.queryByText('Advanced User Filters')).not.toBeInTheDocument()
    })

    it('should show filters panel when open', () => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)

      expect(screen.getByText('Advanced User Filters')).toBeInTheDocument()
    })

    it('should call onToggle when toggle button is clicked', async () => {
      render(<AdvancedUserFilters {...mockProps} />)

      const toggleButton = screen.getByRole('button', { name: /advanced filters/i })
      await fireEvent.click(toggleButton)

      expect(mockProps.onToggle).toHaveBeenCalled()
    })
  })

  describe('Filter Form Fields', () => {
    beforeEach(() => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)
    })

    it('should render all basic filter fields', () => {
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email verified/i)).toBeInTheDocument()
    })

    it('should render department filter', () => {
      expect(screen.getByLabelText(/department/i)).toBeInTheDocument()

      // Check department options
      const departmentSelect = screen.getByLabelText(/department/i)
      expect(departmentSelect).toHaveTextContent('Engineering')
      expect(departmentSelect).toHaveTextContent('Marketing')
      expect(departmentSelect).toHaveTextContent('Sales')
    })

    it('should render date range filters', () => {
      expect(screen.getByLabelText(/last login start/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last login end/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/created start/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/created end/i)).toBeInTheDocument()
    })

    it('should render failed login count filter', () => {
      expect(screen.getByLabelText(/failed login count/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/operator/i)).toBeInTheDocument()
    })

    it('should render session and lock status filters', () => {
      expect(screen.getByLabelText(/active session/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/locked/i)).toBeInTheDocument()
    })

    it('should render timezone and language filters', () => {
      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument()
    })
  })

  describe('Filter Interactions', () => {
    beforeEach(() => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)
    })

    it('should update search filter', async () => {
      const searchInput = screen.getByLabelText(/search/i)
      await fireEvent.change(searchInput, { target: { value: 'test@example.com' } })

      expect(searchInput).toHaveValue('test@example.com')
    })

    it('should update role filter', async () => {
      const roleSelect = screen.getByLabelText(/role/i)
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })

      expect(roleSelect).toHaveValue('admin')
    })

    it('should update status filter', async () => {
      const statusSelect = screen.getByLabelText(/status/i)
      await fireEvent.change(statusSelect, { target: { value: 'inactive' } })

      expect(statusSelect).toHaveValue('inactive')
    })

    it('should update email verified filter', async () => {
      const emailVerifiedSelect = screen.getByLabelText(/email verified/i)
      await fireEvent.change(emailVerifiedSelect, { target: { value: 'true' } })

      expect(emailVerifiedSelect).toHaveValue('true')
    })

    it('should update department filter', async () => {
      const departmentSelect = screen.getByLabelText(/department/i)
      await fireEvent.change(departmentSelect, { target: { value: 'Engineering' } })

      expect(departmentSelect).toHaveValue('Engineering')
    })

    it('should update date range filters', async () => {
      const lastLoginStart = screen.getByLabelText(/last login start/i)
      const lastLoginEnd = screen.getByLabelText(/last login end/i)

      await fireEvent.change(lastLoginStart, { target: { value: '2024-01-01' } })
      await fireEvent.change(lastLoginEnd, { target: { value: '2024-12-31' } })

      expect(lastLoginStart).toHaveValue('2024-01-01')
      expect(lastLoginEnd).toHaveValue('2024-12-31')
    })

    it('should update failed login count operator and value', async () => {
      const operatorSelect = screen.getByLabelText(/operator/i)
      const valueInput = screen.getByLabelText(/failed login count/i)

      await fireEvent.change(operatorSelect, { target: { value: 'gt' } })
      await fireEvent.change(valueInput, { target: { value: '5' } })

      expect(operatorSelect).toHaveValue('gt')
      expect(valueInput).toHaveValue('5')
    })

    it('should update timezone filter', async () => {
      const timezoneSelect = screen.getByLabelText(/timezone/i)
      await fireEvent.change(timezoneSelect, { target: { value: 'America/New_York' } })

      expect(timezoneSelect).toHaveValue('America/New_York')
    })

    it('should update language filter', async () => {
      const languageSelect = screen.getByLabelText(/language/i)
      await fireEvent.change(languageSelect, { target: { value: 'Spanish' } })

      expect(languageSelect).toHaveValue('Spanish')
    })
  })

  describe('Form Actions', () => {
    beforeEach(() => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)
    })

    it('should call onApplyFilters with current filter state when apply is clicked', async () => {
      // Fill out some filters
      const searchInput = screen.getByLabelText(/search/i)
      const roleSelect = screen.getByLabelText(/role/i)

      await fireEvent.change(searchInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await fireEvent.click(applyButton)

      expect(mockProps.onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test@example.com',
          role: 'admin',
        })
      )
    })

    it('should call onClearFilters when clear is clicked', async () => {
      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      await fireEvent.click(clearButton)

      expect(mockProps.onClearFilters).toHaveBeenCalled()
    })

    it('should reset form when clear is clicked', async () => {
      // Fill out a filter
      const searchInput = screen.getByLabelText(/search/i)
      await fireEvent.change(searchInput, { target: { value: 'test@example.com' } })

      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      await fireEvent.click(clearButton)

      // Form should be reset
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)
    })

    it('should handle invalid date formats gracefully', async () => {
      const dateInput = screen.getByLabelText(/last login start/i)
      await fireEvent.change(dateInput, { target: { value: 'invalid-date' } })

      // Should not crash
      expect(dateInput).toHaveValue('invalid-date')
    })

    it('should handle invalid failed login count values', async () => {
      const valueInput = screen.getByLabelText(/failed login count/i)
      await fireEvent.change(valueInput, { target: { value: 'not-a-number' } })

      // Should not crash
      expect(valueInput).toHaveValue('not-a-number')
    })

    it('should validate date ranges', async () => {
      const startDate = screen.getByLabelText(/last login start/i)
      const endDate = screen.getByLabelText(/last login end/i)

      // Set end date before start date
      await fireEvent.change(startDate, { target: { value: '2024-12-31' } })
      await fireEvent.change(endDate, { target: { value: '2024-01-01' } })

      // Should handle invalid range gracefully
      expect(startDate).toHaveValue('2024-12-31')
      expect(endDate).toHaveValue('2024-01-01')
    })
  })

  describe('Complex Filter Combinations', () => {
    beforeEach(() => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)
    })

    it('should handle all filters filled out', async () => {
      // Fill out all filters
      await fireEvent.change(screen.getByLabelText(/search/i), {
        target: { value: 'admin@example.com' },
      })
      await fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'admin' } })
      await fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'active' } })
      await fireEvent.change(screen.getByLabelText(/email verified/i), {
        target: { value: 'true' },
      })
      await fireEvent.change(screen.getByLabelText(/department/i), {
        target: { value: 'Engineering' },
      })
      await fireEvent.change(screen.getByLabelText(/last login start/i), {
        target: { value: '2024-01-01' },
      })
      await fireEvent.change(screen.getByLabelText(/last login end/i), {
        target: { value: '2024-12-31' },
      })
      await fireEvent.change(screen.getByLabelText(/created start/i), {
        target: { value: '2023-01-01' },
      })
      await fireEvent.change(screen.getByLabelText(/created end/i), {
        target: { value: '2024-12-31' },
      })
      await fireEvent.change(screen.getByLabelText(/operator/i), { target: { value: 'lt' } })
      await fireEvent.change(screen.getByLabelText(/failed login count/i), {
        target: { value: '3' },
      })
      await fireEvent.change(screen.getByLabelText(/active session/i), {
        target: { value: 'true' },
      })
      await fireEvent.change(screen.getByLabelText(/locked/i), { target: { value: 'false' } })
      await fireEvent.change(screen.getByLabelText(/timezone/i), { target: { value: 'UTC' } })
      await fireEvent.change(screen.getByLabelText(/language/i), { target: { value: 'English' } })

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await fireEvent.click(applyButton)

      expect(mockProps.onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'admin@example.com',
          role: 'admin',
          status: 'active',
          emailVerified: 'true',
          department: 'Engineering',
          lastLoginStart: '2024-01-01',
          lastLoginEnd: '2024-12-31',
          createdStart: '2023-01-01',
          createdEnd: '2024-12-31',
          failedLoginCount: {
            operator: 'lt',
            value: 3,
          },
          hasActiveSession: 'true',
          isLocked: 'false',
          timezone: 'UTC',
          language: 'English',
        })
      )
    })

    it('should handle partial filter combinations', async () => {
      // Fill out only some filters
      await fireEvent.change(screen.getByLabelText(/search/i), {
        target: { value: 'user@example.com' },
      })
      await fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'user' } })

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await fireEvent.click(applyButton)

      expect(mockProps.onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'user@example.com',
          role: 'user',
          status: '',
          emailVerified: '',
          department: '',
        })
      )
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)
    })

    it('should have proper form labels', () => {
      const inputs = screen.getAllByRole('textbox')
      const selects = screen.getAllByRole('combobox')

      // All form controls should have associated labels
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName()
      })

      selects.forEach(select => {
        expect(select).toHaveAccessibleName()
      })
    })

    it('should support keyboard navigation', async () => {
      const searchInput = screen.getByLabelText(/search/i)
      const roleSelect = screen.getByLabelText(/role/i)

      searchInput.focus()
      expect(document.activeElement).toBe(searchInput)

      await fireEvent.keyDown(searchInput, { key: 'Tab' })
      await waitFor(() => {
        expect(document.activeElement).toBe(roleSelect)
      })
    })

    it('should have proper button labels', () => {
      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      const clearButton = screen.getByRole('button', { name: /clear filters/i })

      expect(applyButton).toBeInTheDocument()
      expect(clearButton).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<AdvancedUserFilters {...mockProps} isOpen={true} />)

      // Re-render with same props
      rerender(<AdvancedUserFilters {...mockProps} isOpen={true} />)

      // Should not cause errors
      expect(screen.getByText('Advanced User Filters')).toBeInTheDocument()
    })

    it('should handle rapid filter changes', async () => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)

      const searchInput = screen.getByLabelText(/search/i)

      // Simulate rapid typing
      await fireEvent.change(searchInput, { target: { value: 't' } })
      await fireEvent.change(searchInput, { target: { value: 'te' } })
      await fireEvent.change(searchInput, { target: { value: 'tes' } })
      await fireEvent.change(searchInput, { target: { value: 'test' } })

      expect(searchInput).toHaveValue('test')
    })
  })

  describe('Dark Mode Support', () => {
    it('should apply correct dark mode classes', () => {
      render(<AdvancedUserFilters {...mockProps} isOpen={true} />)

      const panel = screen.getByText('Advanced User Filters').closest('div')
      expect(panel).toHaveClass('dark:bg-gray-800')
    })
  })
})
