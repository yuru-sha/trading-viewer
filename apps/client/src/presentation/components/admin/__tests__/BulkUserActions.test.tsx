import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '@/presentation/components/../../__tests__/test-utils'
import BulkUserActions from '@/presentation/components/admin/BulkUserActions'
import { apiService } from '@/presentation/components/../../../../services/base/ApiService'

// Mock dependencies
vi.mock('../../../../../services/base/ApiService')
vi.mock('../../../context/ErrorContext', () => ({
  useError: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}))

// Mock window.confirm
const mockConfirm = vi.fn()
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
})

// Mock window.URL and Blob for download functionality
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-blob-url'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
})

global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as any

const mockProps = {
  selectedUsers: ['user1', 'user2', 'user3'],
  onClearSelection: vi.fn(),
  onRefresh: vi.fn(),
}

const mockApiService = vi.mocked(apiService)

describe.skip('BulkUserActions - All Buttons and Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
    mockApiService.post.mockResolvedValue({
      success: true,
      data: {
        success: 3,
        failed: 0,
        errors: [],
      },
    })
  })

  describe('Component Visibility', () => {
    it('should render when users are selected', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('3 users selected')).toBeInTheDocument()
      expect(screen.getByText('Clear Selection')).toBeInTheDocument()
    })

    it('should not render when no users are selected', () => {
      render(<BulkUserActions {...mockProps} selectedUsers={[]} />)

      expect(screen.queryByText('Clear Selection')).not.toBeInTheDocument()
    })

    it('should display correct user count text', () => {
      render(<BulkUserActions {...mockProps} selectedUsers={['user1']} />)
      expect(screen.getByText('1 user selected')).toBeInTheDocument()

      render(<BulkUserActions {...mockProps} selectedUsers={['user1', 'user2']} />)
      expect(screen.getByText('2 users selected')).toBeInTheDocument()
    })
  })

  describe('Clear Selection Button', () => {
    it('should display Clear Selection button', () => {
      render(<BulkUserActions {...mockProps} />)

      const clearButton = screen.getByText('Clear Selection')
      expect(clearButton).toBeInTheDocument()
    })

    it('should call onClearSelection when Clear Selection is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const clearButton = screen.getByText('Clear Selection')
      await fireEvent.click(clearButton)

      expect(mockProps.onClearSelection).toHaveBeenCalledTimes(1)
    })
  })

  describe('Status Action Buttons', () => {
    it('should display Activate button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Activate')).toBeInTheDocument()
    })

    it('should display Deactivate button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Deactivate')).toBeInTheDocument()
    })

    it('should call API and show confirm dialog when Activate is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      await fireEvent.click(activateButton)

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to activate 3 users?')
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'activate',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should call API and show confirm dialog when Deactivate is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const deactivateButton = screen.getByText('Deactivate')
      await fireEvent.click(deactivateButton)

      expect(mockConfirm).toHaveBeenCalledWith(
        "Are you sure you want to deactivate 3 users? They won't be able to log in."
      )
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'deactivate',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should not call API when user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false)
      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      await fireEvent.click(activateButton)

      expect(mockConfirm).toHaveBeenCalled()
      expect(mockApiService.post).not.toHaveBeenCalled()
    })

    it('should show loading state for Activate button', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      await fireEvent.click(activateButton)

      expect(screen.getByText('Activating...')).toBeInTheDocument()
    })

    it('should show loading state for Deactivate button', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const deactivateButton = screen.getByText('Deactivate')
      await fireEvent.click(deactivateButton)

      expect(screen.getByText('Deactivating...')).toBeInTheDocument()
    })
  })

  describe('Role Action Buttons', () => {
    it('should display Make Admin button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Make Admin')).toBeInTheDocument()
    })

    it('should display Make User button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Make User')).toBeInTheDocument()
    })

    it('should call API when Make Admin is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const makeAdminButton = screen.getByText('Make Admin')
      await fireEvent.click(makeAdminButton)

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to make 3 users administrators?'
      )
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'makeAdmin',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should call API when Make User is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const makeUserButton = screen.getByText('Make User')
      await fireEvent.click(makeUserButton)

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to change 3 users to regular user role?'
      )
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'makeUser',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should show loading state for role actions', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const makeAdminButton = screen.getByText('Make Admin')
      await fireEvent.click(makeAdminButton)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })
  })

  describe('Security Action Buttons', () => {
    it('should display Unlock button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Unlock')).toBeInTheDocument()
    })

    it('should display Reset Password button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Reset Password')).toBeInTheDocument()
    })

    it('should call API when Unlock is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const unlockButton = screen.getByText('Unlock')
      await fireEvent.click(unlockButton)

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to unlock 3 users?')
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'unlock',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should call API when Reset Password is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const resetPasswordButton = screen.getByText('Reset Password')
      await fireEvent.click(resetPasswordButton)

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to reset passwords for 3 users? They will receive email instructions.'
      )
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'resetPassword',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should show loading states for security actions', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const unlockButton = screen.getByText('Unlock')
      await fireEvent.click(unlockButton)

      expect(screen.getByText('Unlocking...')).toBeInTheDocument()
    })

    it('should show correct loading state for Reset Password', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const resetPasswordButton = screen.getByText('Reset Password')
      await fireEvent.click(resetPasswordButton)

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })
  })

  describe('Email Action Button', () => {
    it('should display Resend Verification button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Resend Verification')).toBeInTheDocument()
    })

    it('should call API when Resend Verification is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const resendButton = screen.getByText('Resend Verification')
      await fireEvent.click(resendButton)

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to resend email verification to 3 users?'
      )
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'resendVerification',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should show loading state for Resend Verification', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const resendButton = screen.getByText('Resend Verification')
      await fireEvent.click(resendButton)

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })
  })

  describe('Export Action Button', () => {
    it('should display Export JSON button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Export JSON')).toBeInTheDocument()
    })

    it('should call export API when Export JSON is clicked', async () => {
      mockApiService.post.mockResolvedValue({
        data: new Blob(['mock data'], { type: 'application/json' }),
      })

      // Mock DOM methods
      const mockLink = {
        click: vi.fn(),
        href: '',
        download: '',
      }
      const createElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      const appendChild = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => mockLink as any)
      const removeChild = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => mockLink as any)

      render(<BulkUserActions {...mockProps} />)

      const exportButton = screen.getByText('Export JSON')
      await fireEvent.click(exportButton)

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/auth/users/export',
        {
          userIds: ['user1', 'user2', 'user3'],
          format: 'json',
        },
        {
          responseType: 'blob',
        }
      )

      expect(createElement).toHaveBeenCalledWith('a')
      expect(appendChild).toHaveBeenCalled()
      expect(mockLink.click).toHaveBeenCalled()
      expect(removeChild).toHaveBeenCalled()

      createElement.mockRestore()
      appendChild.mockRestore()
      removeChild.mockRestore()
    })

    it('should show loading state for Export', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve({ data: new Blob(['mock data']) }), 100))
      )

      render(<BulkUserActions {...mockProps} />)

      const exportButton = screen.getByText('Export JSON')
      await fireEvent.click(exportButton)

      expect(screen.getByText('Exporting...')).toBeInTheDocument()
    })
  })

  describe('Delete Action Button', () => {
    it('should display Delete button', () => {
      render(<BulkUserActions {...mockProps} />)

      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should call API when Delete is clicked', async () => {
      render(<BulkUserActions {...mockProps} />)

      const deleteButton = screen.getByText('Delete')
      await fireEvent.click(deleteButton)

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete 3 users? This action cannot be undone.'
      )
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/users/bulk', {
        action: 'delete',
        userIds: ['user1', 'user2', 'user3'],
      })
    })

    it('should show loading state for Delete', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const deleteButton = screen.getByText('Delete')
      await fireEvent.click(deleteButton)

      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })
  })

  describe('Loading States and UI', () => {
    it('should display loading indicator with action type', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      await fireEvent.click(activateButton)

      expect(screen.getByText('Processing activate action for 3 users...')).toBeInTheDocument()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })

    it('should disable all buttons during loading', async () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: 3, failed: 0, errors: [] },
                }),
              100
            )
          )
      )

      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      await fireEvent.click(activateButton)

      // All buttons should be disabled during loading
      expect(screen.getByText('Deactivate')).toBeDisabled()
      expect(screen.getByText('Make Admin')).toBeDisabled()
      expect(screen.getByText('Make User')).toBeDisabled()
      expect(screen.getByText('Unlock')).toBeDisabled()
      expect(screen.getByText('Reset Password')).toBeDisabled()
      expect(screen.getByText('Resend Verification')).toBeDisabled()
      expect(screen.getByText('Export JSON')).toBeDisabled()
      expect(screen.getByText('Delete')).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error')
      mockApiService.post.mockRejectedValue(mockError)

      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      await fireEvent.click(activateButton)

      // Should not crash and should handle error
      await waitFor(() => {
        expect(screen.queryByText('Activating...')).not.toBeInTheDocument()
      })
    })

    it('should handle partial failures in bulk operations', async () => {
      mockApiService.post.mockResolvedValue({
        success: true,
        data: {
          success: 2,
          failed: 1,
          errors: ['User not found'],
        },
      })

      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      await fireEvent.click(activateButton)

      expect(mockProps.onClearSelection).toHaveBeenCalled()
      expect(mockProps.onRefresh).toHaveBeenCalled()
    })

    it('should show error when no users selected for actions requiring selection', async () => {
      render(<BulkUserActions {...mockProps} selectedUsers={[]} />)

      // Component should not render when no users selected
      expect(screen.queryByText('Activate')).not.toBeInTheDocument()
    })
  })

  describe('Button Styling and CSS Classes', () => {
    it('should have correct CSS classes for status buttons', () => {
      render(<BulkUserActions {...mockProps} />)

      const activateButton = screen.getByText('Activate')
      expect(activateButton).toHaveClass('bg-green-100', 'text-green-700', 'hover:bg-green-200')

      const deactivateButton = screen.getByText('Deactivate')
      expect(deactivateButton).toHaveClass('bg-red-100', 'text-red-700', 'hover:bg-red-200')
    })

    it('should have correct CSS classes for role buttons', () => {
      render(<BulkUserActions {...mockProps} />)

      const makeAdminButton = screen.getByText('Make Admin')
      expect(makeAdminButton).toHaveClass('bg-purple-100', 'text-purple-700', 'hover:bg-purple-200')

      const makeUserButton = screen.getByText('Make User')
      expect(makeUserButton).toHaveClass('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200')
    })

    it('should have correct CSS classes for security buttons', () => {
      render(<BulkUserActions {...mockProps} />)

      const unlockButton = screen.getByText('Unlock')
      expect(unlockButton).toHaveClass('bg-yellow-100', 'text-yellow-700', 'hover:bg-yellow-200')

      const resetPasswordButton = screen.getByText('Reset Password')
      expect(resetPasswordButton).toHaveClass(
        'bg-orange-100',
        'text-orange-700',
        'hover:bg-orange-200'
      )
    })

    it('should have correct CSS classes for email and delete buttons', () => {
      render(<BulkUserActions {...mockProps} />)

      const resendButton = screen.getByText('Resend Verification')
      expect(resendButton).toHaveClass('bg-blue-100', 'text-blue-700', 'hover:bg-blue-200')

      const deleteButton = screen.getByText('Delete')
      expect(deleteButton).toHaveClass('bg-red-100', 'text-red-700', 'hover:bg-red-200')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<BulkUserActions {...mockProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(9) // All action buttons + clear selection
    })

    it('should have descriptive button text for screen readers', () => {
      render(<BulkUserActions {...mockProps} />)

      // All buttons should have clear, descriptive text
      expect(screen.getByText('Clear Selection')).toBeInTheDocument()
      expect(screen.getByText('Activate')).toBeInTheDocument()
      expect(screen.getByText('Deactivate')).toBeInTheDocument()
      expect(screen.getByText('Make Admin')).toBeInTheDocument()
      expect(screen.getByText('Make User')).toBeInTheDocument()
      expect(screen.getByText('Unlock')).toBeInTheDocument()
      expect(screen.getByText('Reset Password')).toBeInTheDocument()
      expect(screen.getByText('Resend Verification')).toBeInTheDocument()
      expect(screen.getByText('Export JSON')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })
})
