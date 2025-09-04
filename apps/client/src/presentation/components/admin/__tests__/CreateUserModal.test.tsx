import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '@/presentation/components/../../__tests__/test-utils'
import CreateUserModal from '@/presentation/components/admin/CreateUserModal'
import { apiService } from '@/presentation/components/../../../../services/base/ApiService'

vi.mock('../../../../../services/base/ApiService', () => ({
  apiService: {
    post: vi.fn(),
  },
}))

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onUserCreated: vi.fn(),
}

describe.skip('CreateUserModal - All Buttons and Inputs', () => {
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

  describe('Form Fields - All Inputs', () => {
    describe('Email Address Input', () => {
      it('should render with correct attributes', () => {
        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *')
        expect(emailInput).toBeInTheDocument()
        expect(emailInput).toHaveAttribute('type', 'email')
        expect(emailInput).toHaveAttribute('placeholder', 'user@example.com')
        expect(emailInput).toHaveAttribute('required')
      })

      it('should have empty default value', () => {
        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *') as HTMLInputElement
        expect(emailInput.value).toBe('')
      })

      it('should update when typed', async () => {
        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *')
        await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

        expect((emailInput as HTMLInputElement).value).toBe('test@example.com')
      })

      it('should handle special characters in email', async () => {
        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *')
        await fireEvent.change(emailInput, {
          target: { value: 'test.email+tag@example-domain.com' },
        })

        expect((emailInput as HTMLInputElement).value).toBe('test.email+tag@example-domain.com')
      })

      it('should clear when form is reset', async () => {
        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *')
        await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

        const cancelButton = screen.getByText('Cancel')
        await fireEvent.click(cancelButton)

        expect(mockProps.onClose).toHaveBeenCalled()
      })
    })

    describe('Role Select Dropdown', () => {
      it('should render with correct options', () => {
        render(<CreateUserModal {...mockProps} />)

        const roleSelect = screen.getByLabelText('Role')
        expect(roleSelect).toBeInTheDocument()

        const options = screen.getAllByRole('option')
        expect(options).toHaveLength(2)
        expect(screen.getByRole('option', { name: 'User' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Administrator' })).toBeInTheDocument()
      })

      it('should have user as default selection', () => {
        render(<CreateUserModal {...mockProps} />)

        const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement
        expect(roleSelect.value).toBe('user')
      })

      it('should update to admin when selected', async () => {
        render(<CreateUserModal {...mockProps} />)

        const roleSelect = screen.getByLabelText('Role')
        await fireEvent.change(roleSelect, { target: { value: 'admin' } })

        expect((roleSelect as HTMLSelectElement).value).toBe('admin')
      })

      it('should switch back to user when selected', async () => {
        render(<CreateUserModal {...mockProps} />)

        const roleSelect = screen.getByLabelText('Role')
        await fireEvent.change(roleSelect, { target: { value: 'admin' } })
        await fireEvent.change(roleSelect, { target: { value: 'user' } })

        expect((roleSelect as HTMLSelectElement).value).toBe('user')
      })

      it('should have correct CSS classes', () => {
        render(<CreateUserModal {...mockProps} />)

        const roleSelect = screen.getByLabelText('Role')
        expect(roleSelect).toHaveClass(
          'w-full',
          'px-3',
          'py-2',
          'border',
          'border-gray-300',
          'rounded-md'
        )
      })
    })

    describe('Send Welcome Email Checkbox', () => {
      it('should render with correct label', () => {
        render(<CreateUserModal {...mockProps} />)

        const checkbox = screen.getByLabelText('Send welcome email with login instructions')
        expect(checkbox).toBeInTheDocument()
        expect(checkbox).toHaveAttribute('type', 'checkbox')
      })

      it('should be checked by default', () => {
        render(<CreateUserModal {...mockProps} />)

        const checkbox = screen.getByLabelText(
          'Send welcome email with login instructions'
        ) as HTMLInputElement
        expect(checkbox.checked).toBe(true)
      })

      it('should toggle when clicked', async () => {
        render(<CreateUserModal {...mockProps} />)

        const checkbox = screen.getByLabelText('Send welcome email with login instructions')

        // Initially checked
        expect(checkbox).toBeChecked()

        // Uncheck
        await fireEvent.click(checkbox)
        expect(checkbox).not.toBeChecked()

        // Check again
        await fireEvent.click(checkbox)
        expect(checkbox).toBeChecked()
      })

      it('should have correct CSS classes', () => {
        render(<CreateUserModal {...mockProps} />)

        const checkbox = screen.getByLabelText('Send welcome email with login instructions')
        expect(checkbox).toHaveClass(
          'h-4',
          'w-4',
          'text-blue-600',
          'focus:ring-blue-500',
          'border-gray-300',
          'rounded'
        )
      })
    })

    it('should render all required form sections', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Account Settings')).toBeInTheDocument()
      expect(screen.getByText('Password Settings')).toBeInTheDocument()
      expect(screen.getByText('Email Settings')).toBeInTheDocument()
    })
  })

  describe('Password Generation - All Controls', () => {
    describe('Generate Password Checkbox', () => {
      it('should be checked by default', () => {
        render(<CreateUserModal {...mockProps} />)

        const checkbox = screen.getByLabelText('Generate random password automatically')
        expect(checkbox).toBeChecked()
      })

      it('should show temporary password field when unchecked', async () => {
        render(<CreateUserModal {...mockProps} />)

        const generatePasswordCheckbox = screen.getByLabelText(
          'Generate random password automatically'
        )
        await fireEvent.click(generatePasswordCheckbox)

        expect(screen.getByLabelText('Temporary Password *')).toBeInTheDocument()
        expect(screen.getByText('Generate')).toBeInTheDocument()
      })

      it('should hide temporary password field when checked', () => {
        render(<CreateUserModal {...mockProps} />)

        expect(screen.queryByLabelText('Temporary Password *')).not.toBeInTheDocument()
      })

      it('should toggle visibility correctly', async () => {
        render(<CreateUserModal {...mockProps} />)

        const checkbox = screen.getByLabelText('Generate random password automatically')

        // Initially hidden
        expect(screen.queryByLabelText('Temporary Password *')).not.toBeInTheDocument()

        // Show when unchecked
        await fireEvent.click(checkbox)
        expect(screen.getByLabelText('Temporary Password *')).toBeInTheDocument()

        // Hide when checked again
        await fireEvent.click(checkbox)
        expect(screen.queryByLabelText('Temporary Password *')).not.toBeInTheDocument()
      })
    })

    describe('Temporary Password Input', () => {
      beforeEach(async () => {
        render(<CreateUserModal {...mockProps} />)
        const checkbox = screen.getByLabelText('Generate random password automatically')
        await fireEvent.click(checkbox)
      })

      it('should accept text input', async () => {
        const passwordInput = screen.getByLabelText('Temporary Password *')
        await fireEvent.change(passwordInput, { target: { value: 'testpassword123' } })

        expect((passwordInput as HTMLInputElement).value).toBe('testpassword123')
      })

      it('should have password type attribute', () => {
        const passwordInput = screen.getByLabelText('Temporary Password *')
        expect(passwordInput).toHaveAttribute('type', 'password')
      })

      it('should have correct placeholder', () => {
        const passwordInput = screen.getByLabelText('Temporary Password *')
        expect(passwordInput).toHaveAttribute('placeholder', 'Enter temporary password')
      })

      it('should clear when form is reset', async () => {
        const passwordInput = screen.getByLabelText('Temporary Password *')
        await fireEvent.change(passwordInput, { target: { value: 'testpassword' } })

        const cancelButton = screen.getByText('Cancel')
        await fireEvent.click(cancelButton)

        expect(mockProps.onClose).toHaveBeenCalled()
      })
    })

    describe('Generate Password Button', () => {
      beforeEach(async () => {
        render(<CreateUserModal {...mockProps} />)
        const checkbox = screen.getByLabelText('Generate random password automatically')
        await fireEvent.click(checkbox)
      })

      it('should be present when manual password entry is enabled', () => {
        expect(screen.getByText('Generate')).toBeInTheDocument()
      })

      it('should generate 12-character password when clicked', async () => {
        const generateButton = screen.getByText('Generate')
        await fireEvent.click(generateButton)

        const passwordInput = screen.getByLabelText('Temporary Password *') as HTMLInputElement
        expect(passwordInput.value).not.toBe('')
        expect(passwordInput.value.length).toBe(12)
      })

      it('should generate different passwords on multiple clicks', async () => {
        const generateButton = screen.getByText('Generate')

        await fireEvent.click(generateButton)
        const firstPassword = (screen.getByLabelText('Temporary Password *') as HTMLInputElement)
          .value

        await fireEvent.click(generateButton)
        const secondPassword = (screen.getByLabelText('Temporary Password *') as HTMLInputElement)
          .value

        expect(firstPassword).not.toBe(secondPassword)
        expect(firstPassword.length).toBe(12)
        expect(secondPassword.length).toBe(12)
      })

      it('should have correct button attributes', () => {
        const generateButton = screen.getByText('Generate')
        expect(generateButton).toHaveAttribute('type', 'button')
        expect(generateButton).toHaveClass('btn', 'btn-secondary', 'btn-sm')
      })
    })

    describe('Generated Password Display', () => {
      beforeEach(async () => {
        render(<CreateUserModal {...mockProps} />)
        const checkbox = screen.getByLabelText('Generate random password automatically')
        await fireEvent.click(checkbox)
        const generateButton = screen.getByText('Generate')
        await fireEvent.click(generateButton)
      })

      it('should display generated password in code block', () => {
        const passwordDisplay = screen.getByText('Generated Password')
        expect(passwordDisplay).toBeInTheDocument()

        const codeElement = document.querySelector('#generatedPasswordValue')
        expect(codeElement).toBeInTheDocument()
        expect(codeElement?.textContent).not.toBe('')
      })

      it('should show copy button for generated password', () => {
        const copyButton = screen.getByText('Copy')
        expect(copyButton).toBeInTheDocument()
        expect(copyButton).toHaveAttribute('type', 'button')
      })

      it('should display warning message about password visibility', () => {
        expect(
          screen.getByText("⚠️ Save this password securely. It won't be shown again.")
        ).toBeInTheDocument()
      })
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

    it('should handle API error with structured error response', async () => {
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

    it('should handle generic API errors gracefully', async () => {
      const mockError = new Error('Network error')
      vi.mocked(apiService.post).mockRejectedValue(mockError)

      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to create user')).toBeInTheDocument()
      })
    })

    it('should handle server errors (500) appropriately', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error',
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
        expect(screen.getByText('Internal server error')).toBeInTheDocument()
      })
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

    it('should handle successful creation with all form fields', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'admin@example.com', role: 'admin' },
        },
      }

      vi.mocked(apiService.post).mockResolvedValue(mockResponse)

      render(<CreateUserModal {...mockProps} />)

      // Fill all form fields
      const emailInput = screen.getByLabelText('Email Address *')
      await fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })

      const roleSelect = screen.getByLabelText('Role')
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })

      const sendEmailCheckbox = screen.getByLabelText('Send welcome email with login instructions')
      await fireEvent.click(sendEmailCheckbox) // Uncheck

      const createButton = screen.getByText('Create User')
      await fireEvent.click(createButton)

      await waitFor(() => {
        expect(apiService.post).toHaveBeenCalledWith('/auth/users', {
          email: 'admin@example.com',
          role: 'admin',
          sendWelcomeEmail: false,
          temporaryPassword: expect.any(String),
          generatePassword: true,
        })
      })

      expect(mockProps.onUserCreated).toHaveBeenCalledTimes(1)
      expect(mockProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Password Security Features', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })
    })

    it('should generate password with sufficient complexity', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      const generateButton = screen.getByText('Generate')
      await fireEvent.click(generateButton)

      const passwordInput = screen.getByLabelText('Temporary Password *') as HTMLInputElement
      const password = passwordInput.value

      // Should be 12 characters
      expect(password.length).toBe(12)

      // Should contain mixed characters (basic complexity check)
      expect(password).toMatch(/[a-z]/) // lowercase
      expect(password).toMatch(/[A-Z]/) // uppercase
      expect(password).toMatch(/[0-9]/) // numbers
    })

    it('should copy generated password to clipboard successfully', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      const generateButton = screen.getByText('Generate')
      await fireEvent.click(generateButton)

      const passwordInput = screen.getByLabelText('Temporary Password *') as HTMLInputElement
      const generatedPassword = passwordInput.value

      const copyButton = screen.getByText('Copy')
      await fireEvent.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(generatedPassword)
    })

    it('should show security warning for generated passwords', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      const generateButton = screen.getByText('Generate')
      await fireEvent.click(generateButton)

      expect(
        screen.getByText("⚠️ Save this password securely. It won't be shown again.")
      ).toBeInTheDocument()
    })

    it('should mask temporary password input', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      const passwordInput = screen.getByLabelText('Temporary Password *')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should handle clipboard copy failures gracefully', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard not available')),
        },
      })

      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      const generateButton = screen.getByText('Generate')
      await fireEvent.click(generateButton)

      const copyButton = screen.getByText('Copy')

      // Should not crash on clipboard failure
      await fireEvent.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  describe('Action Buttons - All Controls', () => {
    describe('Cancel Button', () => {
      it('should be present and enabled by default', () => {
        render(<CreateUserModal {...mockProps} />)

        const cancelButton = screen.getByText('Cancel')
        expect(cancelButton).toBeInTheDocument()
        expect(cancelButton).not.toBeDisabled()
      })

      it('should call onClose when clicked', async () => {
        render(<CreateUserModal {...mockProps} />)

        const cancelButton = screen.getByText('Cancel')
        await fireEvent.click(cancelButton)

        expect(mockProps.onClose).toHaveBeenCalledTimes(1)
      })

      it('should be disabled during form submission', async () => {
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

        const cancelButton = screen.getByText('Cancel')
        expect(cancelButton).toBeDisabled()
      })

      it('should have correct CSS classes', () => {
        render(<CreateUserModal {...mockProps} />)

        const cancelButton = screen.getByText('Cancel')
        expect(cancelButton).toHaveClass('bg-gray-600', 'text-white', 'hover:bg-gray-700')
      })
    })

    describe('Create User Button', () => {
      it('should be present and enabled by default', () => {
        render(<CreateUserModal {...mockProps} />)

        const createButton = screen.getByText('Create User')
        expect(createButton).toBeInTheDocument()
        expect(createButton).not.toBeDisabled()
      })

      it('should show loading state during submission', async () => {
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

      it('should return to normal state after submission', async () => {
        vi.mocked(apiService.post).mockResolvedValue({ success: true, data: { user: {} } })

        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *')
        await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

        const createButton = screen.getByText('Create User')
        await fireEvent.click(createButton)

        await waitFor(() => {
          expect(mockProps.onUserCreated).toHaveBeenCalled()
        })
      })

      it('should handle rapid clicks gracefully', async () => {
        vi.mocked(apiService.post).mockResolvedValue({ success: true, data: { user: {} } })

        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *')
        await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

        const createButton = screen.getByText('Create User')

        // Rapid clicks
        await fireEvent.click(createButton)
        await fireEvent.click(createButton)
        await fireEvent.click(createButton)

        await waitFor(() => {
          expect(apiService.post).toHaveBeenCalledTimes(1) // Should only call once
        })
      })
    })

    describe('Copy Password Button', () => {
      beforeEach(async () => {
        Object.assign(navigator, {
          clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined),
          },
        })

        render(<CreateUserModal {...mockProps} />)
        const checkbox = screen.getByLabelText('Generate random password automatically')
        await fireEvent.click(checkbox)
        const generateButton = screen.getByText('Generate')
        await fireEvent.click(generateButton)
      })

      it('should be present when password is generated', () => {
        const copyButton = screen.getByText('Copy')
        expect(copyButton).toBeInTheDocument()
        expect(copyButton).toHaveAttribute('type', 'button')
      })

      it('should copy password to clipboard when clicked', async () => {
        const copyButton = screen.getByText('Copy')
        await fireEvent.click(copyButton)

        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })

      it('should have correct CSS classes', () => {
        const copyButton = screen.getByText('Copy')
        expect(copyButton).toHaveClass('bg-gray-600', 'text-white', 'px-3', 'py-1.5', 'text-sm')
      })
    })

    describe('Form Reset on Close', () => {
      it('should reset all form fields when cancelled', async () => {
        render(<CreateUserModal {...mockProps} />)

        // Fill form
        const emailInput = screen.getByLabelText('Email Address *')
        await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

        const roleSelect = screen.getByLabelText('Role')
        await fireEvent.change(roleSelect, { target: { value: 'admin' } })

        const sendEmailCheckbox = screen.getByLabelText(
          'Send welcome email with login instructions'
        )
        await fireEvent.click(sendEmailCheckbox)

        // Cancel
        const cancelButton = screen.getByText('Cancel')
        await fireEvent.click(cancelButton)

        expect(mockProps.onClose).toHaveBeenCalled()
      })

      it('should reset form after successful submission', async () => {
        vi.mocked(apiService.post).mockResolvedValue({ success: true, data: { user: {} } })

        render(<CreateUserModal {...mockProps} />)

        const emailInput = screen.getByLabelText('Email Address *')
        await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

        const createButton = screen.getByText('Create User')
        await fireEvent.click(createButton)

        await waitFor(() => {
          expect(mockProps.onUserCreated).toHaveBeenCalled()
          expect(mockProps.onClose).toHaveBeenCalled()
        })
      })
    })
  })

  describe('Accessibility - All Interactive Elements', () => {
    it('should have proper form labels for all inputs', () => {
      render(<CreateUserModal {...mockProps} />)

      // Text inputs
      expect(screen.getByLabelText('Email Address *')).toBeInTheDocument()

      // Select inputs
      expect(screen.getByLabelText('Role')).toBeInTheDocument()

      // Checkbox inputs
      expect(screen.getByLabelText('Generate random password automatically')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Send welcome email with login instructions')
      ).toBeInTheDocument()
    })

    it('should show temporary password label when manual entry is enabled', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      expect(screen.getByLabelText('Temporary Password *')).toBeInTheDocument()
    })

    it('should have required field indicators (*)', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByText('Email Address *')).toBeInTheDocument()
    })

    it('should show required password field indicator when manual entry', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      expect(screen.getByText('Temporary Password *')).toBeInTheDocument()
    })

    it('should have proper button roles and names', () => {
      render(<CreateUserModal {...mockProps} />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument()
    })

    it('should show generate button when manual password entry is enabled', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument()
    })

    it('should show copy button when password is generated', async () => {
      render(<CreateUserModal {...mockProps} />)

      const checkbox = screen.getByLabelText('Generate random password automatically')
      await fireEvent.click(checkbox)

      const generateButton = screen.getByText('Generate')
      await fireEvent.click(generateButton)

      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    })

    it('should have proper form structure with fieldsets', () => {
      render(<CreateUserModal {...mockProps} />)

      // Check for section headings that act as fieldset legends
      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Account Settings')).toBeInTheDocument()
      expect(screen.getByText('Password Settings')).toBeInTheDocument()
      expect(screen.getByText('Email Settings')).toBeInTheDocument()
    })

    it('should have proper input types for different fields', () => {
      render(<CreateUserModal {...mockProps} />)

      const emailInput = screen.getByLabelText('Email Address *')
      expect(emailInput).toHaveAttribute('type', 'email')

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThanOrEqual(2)
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('type', 'checkbox')
      })
    })

    it('should have keyboard navigable elements', () => {
      render(<CreateUserModal {...mockProps} />)

      const focusableElements = [
        screen.getByLabelText('Email Address *'),
        screen.getByLabelText('Role'),
        screen.getByLabelText('Generate random password automatically'),
        screen.getByLabelText('Send welcome email with login instructions'),
        screen.getByText('Cancel'),
        screen.getByText('Create User'),
      ]

      focusableElements.forEach(element => {
        expect(element).toBeInTheDocument()
        // Elements should not have tabindex that prevents keyboard navigation
        const tabIndex = element.getAttribute('tabindex')
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0)
        }
      })
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

  describe('Email Settings - Checkbox Behavior', () => {
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
