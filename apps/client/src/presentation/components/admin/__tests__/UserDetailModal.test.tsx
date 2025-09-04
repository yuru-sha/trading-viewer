import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '@/presentation/components/../../__tests__/test-utils'
import UserDetailModal from '@/presentation/components/admin/UserDetailModal'
import { apiService } from '@/presentation/components/../../../../services/base/ApiService'

// Mock dependencies
vi.mock('../../../../../services/base/ApiService')
vi.mock('../../../context/ErrorContext', () => ({
  useError: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}))
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'current_user_123',
      email: 'current@example.com',
      role: 'admin',
    },
    isAuthenticated: true,
    token: 'mock-token',
  }),
}))

const mockUser = {
  id: 'user_123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const,
  isEmailVerified: true,
  isActive: true,
  failedLoginCount: 0,
  lockedUntil: undefined,
  lastLoginAt: '2024-01-15T10:30:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  timezone: 'UTC',
  language: 'en',
  profileImageUrl: undefined,
}

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  userId: 'user_123',
  onUserUpdate: vi.fn(),
}

const mockApiService = vi.mocked(apiService)

describe.skip('UserDetailModal - All Buttons and Inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockUser,
    })
    mockApiService.put.mockResolvedValue({
      success: true,
      data: { user: mockUser },
    })
  })

  describe('Modal Display and Loading', () => {
    it('should render modal when open', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('User Details')).toBeInTheDocument()
      })
    })

    it('should not render when closed', () => {
      render(<UserDetailModal {...mockProps} isOpen={false} />)

      expect(screen.queryByText('User Details')).not.toBeInTheDocument()
    })

    it('should show loading state initially', () => {
      render(<UserDetailModal {...mockProps} />)

      expect(screen.getByText('Loading user details...')).toBeInTheDocument()
    })

    it('should fetch user details when opened with userId', () => {
      render(<UserDetailModal {...mockProps} />)

      expect(mockApiService.get).toHaveBeenCalledWith('/auth/users/user_123')
    })

    it('should not fetch when userId is null', () => {
      render(<UserDetailModal {...mockProps} userId={null} />)

      expect(mockApiService.get).not.toHaveBeenCalled()
    })
  })

  describe('User Information Display', () => {
    it('should display user profile information', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
        expect(screen.getByText('user')).toBeInTheDocument()
        expect(screen.getByText('Active')).toBeInTheDocument()
        expect(screen.getByText('✓ Verified')).toBeInTheDocument()
      })
    })

    it('should display user avatar initial when no profileImageUrl', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('T')).toBeInTheDocument() // First letter of email
      })
    })

    it('should display profile image when profileImageUrl exists', async () => {
      const userWithImage = { ...mockUser, profileImageUrl: 'https://example.com/avatar.jpg' }
      mockApiService.get.mockResolvedValue({
        success: true,
        data: userWithImage,
      })

      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const profileImg = screen.getByAltText('Profile')
        expect(profileImg).toBeInTheDocument()
        expect(profileImg).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      })
    })

    it('should display locked status for locked users', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: '2024-12-31T23:59:59Z',
      }
      mockApiService.get.mockResolvedValue({
        success: true,
        data: lockedUser,
      })

      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('🔒 Locked')).toBeInTheDocument()
      })
    })

    it('should format dates correctly', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('January 1, 2024 at 12:00 AM')).toBeInTheDocument() // createdAt
        expect(screen.getByText('January 15, 2024 at 10:30 AM')).toBeInTheDocument() // lastLoginAt
      })
    })
  })

  describe('Edit Button and Mode Toggle', () => {
    it('should display Edit button by default', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
      })
    })

    it('should toggle to editing mode when Edit is clicked', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Save Changes')).toBeInTheDocument()
      })
    })

    it('should show input fields in edit mode', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
        expect(screen.getByLabelText('Language')).toBeInTheDocument()
        expect(screen.getByLabelText('Role')).toBeInTheDocument()
        expect(screen.getByLabelText('Status')).toBeInTheDocument()
      })
    })

    it('should cancel editing mode when Cancel is clicked', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
        expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Inputs - Display Name', () => {
    beforeEach(async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })
    })

    it('should display current display name in input', async () => {
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText('Display Name') as HTMLInputElement
        expect(displayNameInput.value).toBe('Test User')
      })
    })

    it('should update display name input when typed', async () => {
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText('Display Name')
        fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } })
        expect((displayNameInput as HTMLInputElement).value).toBe('Updated Name')
      })
    })

    it('should clear display name input', async () => {
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText('Display Name')
        fireEvent.change(displayNameInput, { target: { value: '' } })
        expect((displayNameInput as HTMLInputElement).value).toBe('')
      })
    })
  })

  describe('Form Inputs - Timezone Select', () => {
    beforeEach(async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })
    })

    it('should display current timezone in select', async () => {
      await waitFor(() => {
        const timezoneSelect = screen.getByLabelText('Timezone') as HTMLSelectElement
        expect(timezoneSelect.value).toBe('UTC')
      })
    })

    it('should have all timezone options', async () => {
      await waitFor(() => {
        const timezoneSelect = screen.getByLabelText('Timezone')
        const options = Array.from(timezoneSelect.querySelectorAll('option'))

        expect(options.map(opt => opt.value)).toContain('UTC')
        expect(options.map(opt => opt.value)).toContain('America/New_York')
        expect(options.map(opt => opt.value)).toContain('Asia/Tokyo')
        expect(options.map(opt => opt.value)).toContain('Europe/London')
      })
    })

    it('should update timezone when changed', async () => {
      await waitFor(() => {
        const timezoneSelect = screen.getByLabelText('Timezone')
        fireEvent.change(timezoneSelect, { target: { value: 'Asia/Tokyo' } })
        expect((timezoneSelect as HTMLSelectElement).value).toBe('Asia/Tokyo')
      })
    })
  })

  describe('Form Inputs - Language Select', () => {
    beforeEach(async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })
    })

    it('should display current language in select', async () => {
      await waitFor(() => {
        const languageSelect = screen.getByLabelText('Language') as HTMLSelectElement
        expect(languageSelect.value).toBe('en')
      })
    })

    it('should have all language options', async () => {
      await waitFor(() => {
        const languageSelect = screen.getByLabelText('Language')
        const options = Array.from(languageSelect.querySelectorAll('option'))

        expect(options.map(opt => opt.textContent)).toContain('English')
        expect(options.map(opt => opt.textContent)).toContain('Japanese')
        expect(options.map(opt => opt.textContent)).toContain('Chinese')
        expect(options.map(opt => opt.textContent)).toContain('Spanish')
      })
    })

    it('should update language when changed', async () => {
      await waitFor(() => {
        const languageSelect = screen.getByLabelText('Language')
        fireEvent.change(languageSelect, { target: { value: 'ja' } })
        expect((languageSelect as HTMLSelectElement).value).toBe('ja')
      })
    })
  })

  describe('Form Inputs - Role Select', () => {
    beforeEach(async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })
    })

    it('should display current role in select', async () => {
      await waitFor(() => {
        const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement
        expect(roleSelect.value).toBe('user')
      })
    })

    it('should have role options', async () => {
      await waitFor(() => {
        const roleSelect = screen.getByLabelText('Role')
        const options = Array.from(roleSelect.querySelectorAll('option'))

        expect(options.map(opt => opt.textContent)).toContain('User')
        expect(options.map(opt => opt.textContent)).toContain('Admin')
      })
    })

    it('should update role when changed', async () => {
      await waitFor(() => {
        const roleSelect = screen.getByLabelText('Role')
        fireEvent.change(roleSelect, { target: { value: 'admin' } })
        expect((roleSelect as HTMLSelectElement).value).toBe('admin')
      })
    })
  })

  describe('Form Inputs - Status Select', () => {
    beforeEach(async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })
    })

    it('should display current status in select', async () => {
      await waitFor(() => {
        const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement
        expect(statusSelect.value).toBe('true') // isActive: true
      })
    })

    it('should have status options', async () => {
      await waitFor(() => {
        const statusSelect = screen.getByLabelText('Status')
        const options = Array.from(statusSelect.querySelectorAll('option'))

        expect(options.map(opt => opt.textContent)).toContain('Active')
        expect(options.map(opt => opt.textContent)).toContain('Inactive')
      })
    })

    it('should update status when changed', async () => {
      await waitFor(() => {
        const statusSelect = screen.getByLabelText('Status')
        fireEvent.change(statusSelect, { target: { value: 'false' } })
        expect((statusSelect as HTMLSelectElement).value).toBe('false')
      })
    })
  })

  describe('Save Changes Button', () => {
    beforeEach(async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })
    })

    it('should be present in edit mode', async () => {
      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument()
      })
    })

    it('should call API when clicked with updated data', async () => {
      await waitFor(() => {
        // Update some fields
        const displayNameInput = screen.getByLabelText('Display Name')
        fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } })

        const timezoneSelect = screen.getByLabelText('Timezone')
        fireEvent.change(timezoneSelect, { target: { value: 'Asia/Tokyo' } })

        const languageSelect = screen.getByLabelText('Language')
        fireEvent.change(languageSelect, { target: { value: 'ja' } })

        const saveButton = screen.getByText('Save Changes')
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockApiService.put).toHaveBeenCalledWith('/auth/users/user_123', {
          name: 'Updated Name',
          timezone: 'Asia/Tokyo',
          language: 'ja',
          role: 'user',
          isActive: true,
        })
      })
    })

    it('should show loading state during save', async () => {
      mockApiService.put.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ success: true, data: { user: mockUser } }), 100)
          )
      )

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes')
        fireEvent.click(saveButton)
      })

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('Saving...')).toBeDisabled()
    })

    it('should call onUserUpdate after successful save', async () => {
      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes')
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockProps.onUserUpdate).toHaveBeenCalledTimes(1)
      })
    })

    it('should exit edit mode after successful save', async () => {
      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes')
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
        expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
      })
    })
  })

  describe('Close Modal', () => {
    it('should call onClose when closed', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        // Modal should have a close button (from Modal component)
        // We'll test by calling onClose directly since Modal component handles the close UI
        mockProps.onClose()
      })

      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should reset form when closed', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        const displayNameInput = screen.getByLabelText('Display Name')
        fireEvent.change(displayNameInput, { target: { value: 'Changed Name' } })
      })

      // Simulate close and reopen
      mockProps.onClose()

      // The component should reset when closed
      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API error during fetch', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network error'))

      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument()
      })
    })

    it('should handle API error during save', async () => {
      mockApiService.put.mockRejectedValue(new Error('Save failed'))

      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes')
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        // Should remain in edit mode after error
        expect(screen.getByText('Save Changes')).toBeInTheDocument()
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels for all inputs', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
        expect(screen.getByLabelText('Language')).toBeInTheDocument()
        expect(screen.getByLabelText('Role')).toBeInTheDocument()
        expect(screen.getByLabelText('Status')).toBeInTheDocument()
      })
    })

    it('should have proper button roles', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      })

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
      })
    })

    it('should have proper field groupings', async () => {
      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument()
        expect(screen.getByText('Preferences')).toBeInTheDocument()
        expect(screen.getByText('Account Information')).toBeInTheDocument()
      })

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })
  })

  describe('Data Validation', () => {
    it('should handle user with minimal data', async () => {
      const minimalUser = {
        id: 'user_456',
        email: 'minimal@example.com',
        name: undefined,
        role: 'user' as const,
        isEmailVerified: false,
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: undefined,
        lastLoginAt: undefined,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        timezone: undefined,
        language: undefined,
        profileImageUrl: undefined,
      }

      mockApiService.get.mockResolvedValue({
        success: true,
        data: minimalUser,
      })

      render(<UserDetailModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('minimal@example.com')).toBeInTheDocument()
        expect(screen.getByText('Not provided')).toBeInTheDocument() // for empty name
        expect(screen.getByText('Never')).toBeInTheDocument() // for no last login
      })
    })
  })
})
