import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '../../../__tests__/test-utils'
import CreateUserModal from '../CreateUserModal'
import { apiService } from '../../../services/base/ApiService'

vi.mock('../../../services/base/ApiService', () => ({
  apiService: {
    post: vi.fn(),
  },
}))

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onUserCreated: vi.fn(),
}

describe('CreateUserModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Display', () => {
    it('should render the modal when open', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByText('Create New User')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<CreateUserModal {...mockProps} isOpen={false} />)

      expect(screen.queryByText('Create New User')).not.toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByLabelText('Email Address *')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      expect(screen.getByLabelText('Generate random password automatically')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Send welcome email with login instructions')
      ).toBeInTheDocument()
    })

    it('should have correct default values', () => {
      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *') as HTMLInputElement
      const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement
      const generatePasswordCheckbox = screen.getByLabelText(
        'Generate random password automatically'
      ) as HTMLInputElement
      const sendEmailCheckbox = screen.getByLabelText(
        'Send welcome email with login instructions'
      ) as HTMLInputElement

      expect(emailInput.value).toBe('')
      expect(roleSelect.value).toBe('user')
      expect(generatePasswordCheckbox.checked).toBe(true)
      expect(sendEmailCheckbox.checked).toBe(true)
    })

    it('should update email field when typed', async () => {
      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect((emailInput as HTMLInputElement).value).toBe('test@example.com')
    })

    it('should update role when selected', async () => {
      render(<CreateUserModal {...mockProps} />)

      const roleSelect = screen.getByLabelText('Role')
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })

      expect((roleSelect as HTMLSelectElement).value).toBe('admin')
    })
  })

  describe('Password Generation', () => {
    it('should show temporary password field when generate password is unchecked', async () => {
      render(<CreateUserModal {...mockProps} />)

      const generatePasswordCheckbox = screen.getByLabelText(
        'Generate random password automatically'
      )
      await fireEvent.click(generatePasswordCheckbox)

      expect(screen.getByLabelText('Temporary Password *')).toBeInTheDocument()
    })

    it('should hide temporary password field when generate password is checked', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.queryByLabelText('Temporary Password *')).not.toBeInTheDocument()
    })

    it('should generate password when generate button is clicked', async () => {
      render(<CreateUserModal {...mockProps} />)

      const generatePasswordCheckbox = screen.getByLabelText(
        'Generate random password automatically'
      )
      await fireEvent.click(generatePasswordCheckbox)

      const generateButton = screen.getByText('Generate')
      await fireEvent.click(generateButton)

      const passwordInput = screen.getByLabelText('Temporary Password *') as HTMLInputElement
      expect(passwordInput.value).not.toBe('')
      expect(passwordInput.value.length).toBe(12)
    })
  })

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      render(<CreateUserModal {...mockProps} />)

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })
    })

    it('should show error for invalid email format', async () => {
      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
    })

    it('should show error when temporary password is empty and generate password is disabled', async () => {
      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const generatePasswordCheckbox = screen.getByLabelText(
        'Generate random password automatically'
      )
      await fireEvent.click(generatePasswordCheckbox)

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(
          screen.getByText('Please provide a temporary password or enable password generation')
        ).toBeInTheDocument()
      })
    })

    it('should show error for short password', async () => {
      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const generatePasswordCheckbox = screen.getByLabelText(
        'Generate random password automatically'
      )
      await fireEvent.click(generatePasswordCheckbox)

      const passwordInput = screen.getByLabelText('Temporary Password *')
      await fireEvent.change(passwordInput, { target: { value: '123' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
      })
    })
  })

  describe('User Creation', () => {
    it('should successfully create user with valid data', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
        },
      }

      vi.mocked(apiService.post).mockResolvedValue(mockResponse)

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(apiService.post).toHaveBeenCalledWith('/auth/users', {
          email: 'test@example.com',
          role: 'user',
          sendWelcomeEmail: true,
          temporaryPassword: expect.any(String),
          generatePassword: true,
        })
      })

      expect(mockProps.onUserCreated).toHaveBeenCalled()
      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should handle API error during user creation', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Email already exists',
          },
        },
      }

      vi.mocked(apiService.post).mockRejectedValue(mockError)

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })

      expect(mockProps.onUserCreated).not.toHaveBeenCalled()
      expect(mockProps.onClose).not.toHaveBeenCalled()
    })

    it('should show loading state during user creation', async () => {
      vi.mocked(apiService.post).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ success: true, data: { user: {} } }), 100)
          )
      )

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(createButton).toBeDisabled()
    })

    it('should display generated password when returned from API', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
          temporaryPassword: 'generated-password-123',
        },
      }

      vi.mocked(apiService.post).mockResolvedValue(mockResponse)

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Generated Password')).toBeInTheDocument()
        expect(screen.getByText('generated-password-123')).toBeInTheDocument()
      })
    })
  })

  describe('Password Clipboard Copy', () => {
    it('should copy generated password to clipboard', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })

      render(<CreateUserModal {...mockProps} />)

      const generatePasswordCheckbox = screen.getByLabelText(
        'Generate random password automatically'
      )
      await fireEvent.click(generatePasswordCheckbox)

      const generateButton = screen.getByText('Generate')
      await fireEvent.click(generateButton)

      const copyButton = screen.getByText('Copy')
      await fireEvent.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  describe('Modal Close', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(<CreateUserModal {...mockProps} />)

      const cancelButton = screen.getByText('Cancel')
      await fireEvent.click(cancelButton)

      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should reset form when modal is closed', async () => {
      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const cancelButton = screen.getByText('Cancel')
      await fireEvent.click(cancelButton)

      // Re-render with modal open to check if form is reset
      render(<CreateUserModal {...mockProps} />)

      const resetEmailInput = screen.getByLabelText('Email Address *') as HTMLInputElement
      expect(resetEmailInput.value).toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByLabelText('Email Address *')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      expect(screen.getByLabelText('Generate random password automatically')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Send welcome email with login instructions')
      ).toBeInTheDocument()
    })

    it('should have required field indicators', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByText('Email Address *')).toBeInTheDocument()
    })

    it('should have proper button roles', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument()
    })
  })

  describe('Role Selection', () => {
    it('should create admin user when admin role is selected', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'admin@example.com' },
        },
      }

      vi.mocked(apiService.post).mockResolvedValue(mockResponse)

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })

      const roleSelect = screen.getByLabelText('Role')
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(apiService.post).toHaveBeenCalledWith(
          '/auth/users',
          expect.objectContaining({
            email: 'admin@example.com',
            role: 'admin',
          })
        )
      })
    })
  })

  describe('Email Settings', () => {
    it('should send welcome email when checkbox is checked', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
        },
      }

      vi.mocked(apiService.post).mockResolvedValue(mockResponse)

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(apiService.post).toHaveBeenCalledWith(
          '/auth/users',
          expect.objectContaining({
            sendWelcomeEmail: true,
          })
        )
      })
    })

    it('should not send welcome email when checkbox is unchecked', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
        },
      }

      vi.mocked(apiService.post).mockResolvedValue(mockResponse)

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const sendEmailCheckbox = screen.getByLabelText('Send welcome email with login instructions')
      await fireEvent.click(sendEmailCheckbox)

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(apiService.post).toHaveBeenCalledWith(
          '/auth/users',
          expect.objectContaining({
            sendWelcomeEmail: false,
          })
        )
      })
    })
  })
})
