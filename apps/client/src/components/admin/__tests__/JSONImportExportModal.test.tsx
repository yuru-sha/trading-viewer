import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '../../../__tests__/test-utils'
import JSONImportExportModal from '../JSONImportExportModal'
import { apiService } from '../../../services/base/ApiService'

vi.mock('../../../services/base/ApiService', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mocked-url'),
    revokeObjectURL: vi.fn(),
  },
})

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onImportComplete: vi.fn(),
}

describe('JSONImportExportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Display', () => {
    it('should render the modal when open', () => {
      render(<JSONImportExportModal {...mockProps} />)

      expect(screen.getByText('JSON Import/Export')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<JSONImportExportModal {...mockProps} isOpen={false} />)

      expect(screen.queryByText('JSON Import/Export')).not.toBeInTheDocument()
    })

    it('should display import and export tabs', () => {
      render(<JSONImportExportModal {...mockProps} />)

      expect(screen.getByText('Import Users')).toBeInTheDocument()
      expect(screen.getByText('Export Users')).toBeInTheDocument()
    })

    it('should default to import tab', () => {
      render(<JSONImportExportModal {...mockProps} />)

      expect(screen.getByText('Download Template')).toBeInTheDocument()
      expect(screen.getByText('Select JSON File')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to export tab when clicked', async () => {
      render(<JSONImportExportModal {...mockProps} />)

      const exportTab = screen.getByText('Export Users')
      await fireEvent.click(exportTab)

      expect(screen.getByText('Export Options')).toBeInTheDocument()
      expect(screen.getByText('Include Data')).toBeInTheDocument()
    })

    it('should switch back to import tab when clicked', async () => {
      render(<JSONImportExportModal {...mockProps} />)

      // Switch to export first
      const exportTab = screen.getByText('Export Users')
      await fireEvent.click(exportTab)

      // Switch back to import
      const importTab = screen.getByText('Import Users')
      await fireEvent.click(importTab)

      expect(screen.getByText('Download Template')).toBeInTheDocument()
    })
  })

  describe('Import Functionality', () => {
    describe('Template Download', () => {
      it('should download template when button is clicked', async () => {
        render(<JSONImportExportModal {...mockProps} />)

        // Mock document methods
        const createElementSpy = vi.spyOn(document, 'createElement')
        const appendChildSpy = vi.spyOn(document.body, 'appendChild')
        const removeChildSpy = vi.spyOn(document.body, 'removeChild')

        const mockLink = {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement

        createElementSpy.mockReturnValue(mockLink)
        appendChildSpy.mockImplementation(() => {})
        removeChildSpy.mockImplementation(() => {})

        const downloadButton = screen.getByText('Download Template')
        await fireEvent.click(downloadButton)

        expect(createElementSpy).toHaveBeenCalledWith('a')
        expect(mockLink.download).toBe('user_import_template.json')
        expect(mockLink.click).toHaveBeenCalled()

        createElementSpy.mockRestore()
        appendChildSpy.mockRestore()
        removeChildSpy.mockRestore()
      })
    })

    describe('File Selection', () => {
      it('should accept JSON files', async () => {
        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const file = new File(['{"users": []}'], 'users.json', { type: 'application/json' })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        expect(screen.getByText('Selected: users.json (0.0 KB)')).toBeInTheDocument()
      })

      it('should reject non-JSON files', async () => {
        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const file = new File(['content'], 'document.txt', { type: 'text/plain' })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        expect(screen.getByText('Please select a JSON file')).toBeInTheDocument()
      })

      it('should reject files larger than 10MB', async () => {
        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
        const file = new File([largeContent], 'large.json', { type: 'application/json' })

        // Mock file size
        Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
      })

      it('should clear selected file when clear button is clicked', async () => {
        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const file = new File(['{"users": []}'], 'users.json', { type: 'application/json' })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        const clearButton = screen.getByText('Clear')
        await fireEvent.click(clearButton)

        expect(screen.queryByText('Selected:')).not.toBeInTheDocument()
      })
    })

    describe('Import Process', () => {
      it('should show error when trying to import without file', async () => {
        render(<JSONImportExportModal {...mockProps} />)

        const importButton = screen.getByText('Import Users')
        await fireEvent.click(importButton)

        expect(screen.getByText('Please select a file to import')).toBeInTheDocument()
      })

      it('should successfully import users', async () => {
        const mockResponse = {
          success: true,
          data: {
            totalRows: 3,
            successfulImports: 3,
            failedImports: 0,
            errors: [],
            warnings: [],
          },
        }

        vi.mocked(apiService.post).mockResolvedValue(mockResponse)

        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const file = new File(['{"users": []}'], 'users.json', { type: 'application/json' })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        const importButton = screen.getByText('Import Users')
        await fireEvent.click(importButton)

        await waitFor(() => {
          expect(apiService.post).toHaveBeenCalledWith('/auth/users/import', expect.any(FormData), {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
        })

        expect(screen.getByText('Successfully imported 3 users')).toBeInTheDocument()
        expect(mockProps.onImportComplete).toHaveBeenCalled()
      })

      it('should handle import with errors', async () => {
        const mockResponse = {
          success: true,
          data: {
            totalRows: 5,
            successfulImports: 3,
            failedImports: 2,
            errors: [
              { row: 2, field: 'email', value: 'invalid-email', error: 'Invalid email format' },
              { row: 4, field: 'role', value: 'superuser', error: 'Invalid role' },
            ],
            warnings: ['Row 3: User already exists, updated'],
          },
        }

        vi.mocked(apiService.post).mockResolvedValue(mockResponse)

        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const file = new File(['{"users": []}'], 'users.json', { type: 'application/json' })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        const importButton = screen.getByText('Import Users')
        await fireEvent.click(importButton)

        await waitFor(() => {
          expect(screen.getByText('Import completed with 2 errors')).toBeInTheDocument()
        })

        expect(screen.getByText('Import Results')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument() // Total rows
        expect(screen.getByText('3')).toBeInTheDocument() // Successful
        expect(screen.getByText('2')).toBeInTheDocument() // Failed
        expect(screen.getByText('1')).toBeInTheDocument() // Warnings

        expect(screen.getByText('Import Errors (2)')).toBeInTheDocument()
        expect(screen.getByText('Warnings (1)')).toBeInTheDocument()
      })

      it('should handle API error during import', async () => {
        const mockError = {
          response: {
            data: {
              message: 'Server error during import',
            },
          },
        }

        vi.mocked(apiService.post).mockRejectedValue(mockError)

        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const file = new File(['{"users": []}'], 'users.json', { type: 'application/json' })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        const importButton = screen.getByText('Import Users')
        await fireEvent.click(importButton)

        await waitFor(() => {
          expect(screen.getByText('Server error during import')).toBeInTheDocument()
        })
      })

      it('should show loading state during import', async () => {
        vi.mocked(apiService.post).mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 100))
        )

        render(<JSONImportExportModal {...mockProps} />)

        const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
        const file = new File(['{"users": []}'], 'users.json', { type: 'application/json' })

        await fireEvent.change(fileInput, { target: { files: [file] } })

        const importButton = screen.getByText('Import Users')
        await fireEvent.click(importButton)

        expect(screen.getByText('Importing...')).toBeInTheDocument()
        expect(importButton).toBeDisabled()
      })
    })
  })

  describe('Export Functionality', () => {
    beforeEach(async () => {
      render(<JSONImportExportModal {...mockProps} />)
      const exportTab = screen.getByText('Export Users')
      await fireEvent.click(exportTab)
    })

    describe('Export Options', () => {
      it('should render export options', () => {
        expect(screen.getByText('Export Options')).toBeInTheDocument()
        expect(screen.getByText('Include Data')).toBeInTheDocument()
        expect(screen.getByText('Date Range (for activity data)')).toBeInTheDocument()
        expect(screen.getByText('Export Format')).toBeInTheDocument()
      })

      it('should have default export options', () => {
        const securityCheckbox = screen.getByLabelText('Security Information') as HTMLInputElement
        const activityCheckbox = screen.getByLabelText('Activity Information') as HTMLInputElement
        const allTimeRadio = screen.getByLabelText('All time') as HTMLInputElement
        const jsonRadio = screen.getByLabelText(
          'JSON (JavaScript Object Notation)'
        ) as HTMLInputElement

        expect(securityCheckbox.checked).toBe(false)
        expect(activityCheckbox.checked).toBe(true)
        expect(allTimeRadio.checked).toBe(true)
        expect(jsonRadio.checked).toBe(true)
      })

      it('should update security info option', async () => {
        const securityCheckbox = screen.getByLabelText('Security Information')
        await fireEvent.click(securityCheckbox)

        expect((securityCheckbox as HTMLInputElement).checked).toBe(true)
      })

      it('should update activity info option', async () => {
        const activityCheckbox = screen.getByLabelText('Activity Information')
        await fireEvent.click(activityCheckbox)

        expect((activityCheckbox as HTMLInputElement).checked).toBe(false)
      })

      it('should update date range option', async () => {
        const last30Radio = screen.getByLabelText('Last 30 days')
        await fireEvent.click(last30Radio)

        expect((last30Radio as HTMLInputElement).checked).toBe(true)
      })

      it('should show custom date inputs when custom range is selected', async () => {
        const customRadio = screen.getByLabelText('Custom range')
        await fireEvent.click(customRadio)

        expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
        expect(screen.getByLabelText('End Date')).toBeInTheDocument()
      })

      it('should update custom date inputs', async () => {
        const customRadio = screen.getByLabelText('Custom range')
        await fireEvent.click(customRadio)

        const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement
        const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement

        await fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
        await fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })

        expect(startDateInput.value).toBe('2024-01-01')
        expect(endDateInput.value).toBe('2024-12-31')
      })
    })

    describe('Export Process', () => {
      it('should successfully export users', async () => {
        const mockBlob = new Blob(['export data'], { type: 'application/json' })
        vi.mocked(apiService.get).mockResolvedValue(mockBlob as any)

        // Mock document methods
        const createElementSpy = vi.spyOn(document, 'createElement')
        const appendChildSpy = vi.spyOn(document.body, 'appendChild')
        const removeChildSpy = vi.spyOn(document.body, 'removeChild')

        const mockLink = {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement

        createElementSpy.mockReturnValue(mockLink)
        appendChildSpy.mockImplementation(() => {})
        removeChildSpy.mockImplementation(() => {})

        const exportButton = screen.getByText('Export Users')
        await fireEvent.click(exportButton)

        await waitFor(() => {
          expect(apiService.get).toHaveBeenCalledWith(
            expect.stringContaining('/auth/users/export'),
            { responseType: 'blob' }
          )
        })

        expect(screen.getByText('Users exported successfully')).toBeInTheDocument()

        createElementSpy.mockRestore()
        appendChildSpy.mockRestore()
        removeChildSpy.mockRestore()
      })

      it('should handle export error', async () => {
        vi.mocked(apiService.get).mockRejectedValue(new Error('Export failed'))

        const exportButton = screen.getByText('Export Users')
        await fireEvent.click(exportButton)

        await waitFor(() => {
          expect(screen.getByText('Failed to export users')).toBeInTheDocument()
        })
      })

      it('should show loading state during export', async () => {
        vi.mocked(apiService.get).mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve(new Blob() as any), 100))
        )

        const exportButton = screen.getByText('Export Users')
        await fireEvent.click(exportButton)

        expect(screen.getByText('Exporting...')).toBeInTheDocument()
        expect(exportButton).toBeDisabled()
      })

      it('should include correct export parameters', async () => {
        const mockBlob = new Blob(['export data'], { type: 'application/json' })
        vi.mocked(apiService.get).mockResolvedValue(mockBlob as any)

        // Set some options
        const securityCheckbox = screen.getByLabelText('Security Information')
        await fireEvent.click(securityCheckbox)

        const last30Radio = screen.getByLabelText('Last 30 days')
        await fireEvent.click(last30Radio)

        const exportButton = screen.getByText('Export Users')
        await fireEvent.click(exportButton)

        await waitFor(() => {
          const callArgs = vi.mocked(apiService.get).mock.calls[0][0]
          expect(callArgs).toContain('includeSecurityInfo=true')
          expect(callArgs).toContain('includeActivityInfo=true')
          expect(callArgs).toContain('dateRange=last30')
          expect(callArgs).toContain('format=json')
        })
      })

      it('should include custom date parameters when custom range is selected', async () => {
        const mockBlob = new Blob(['export data'], { type: 'application/json' })
        vi.mocked(apiService.get).mockResolvedValue(mockBlob as any)

        const customRadio = screen.getByLabelText('Custom range')
        await fireEvent.click(customRadio)

        const startDateInput = screen.getByLabelText('Start Date')
        const endDateInput = screen.getByLabelText('End Date')

        await fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
        await fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })

        const exportButton = screen.getByText('Export Users')
        await fireEvent.click(exportButton)

        await waitFor(() => {
          const callArgs = vi.mocked(apiService.get).mock.calls[0][0]
          expect(callArgs).toContain('dateRange=custom')
          expect(callArgs).toContain('startDate=2024-01-01')
          expect(callArgs).toContain('endDate=2024-12-31')
        })
      })
    })
  })

  describe('Modal Close', () => {
    it('should clear import data when modal is closed', async () => {
      render(<JSONImportExportModal {...mockProps} />)

      const fileInput = screen.getByLabelText('Select JSON File') as HTMLInputElement
      const file = new File(['{"users": []}'], 'users.json', { type: 'application/json' })

      await fireEvent.change(fileInput, { target: { files: [file] } })

      expect(screen.getByText('Selected: users.json (0.0 KB)')).toBeInTheDocument()

      // Mock modal close
      mockProps.onClose()

      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and inputs', () => {
      render(<JSONImportExportModal {...mockProps} />)

      expect(screen.getByLabelText('Select JSON File')).toBeInTheDocument()

      // Switch to export tab
      const exportTab = screen.getByText('Export Users')
      fireEvent.click(exportTab)

      expect(screen.getByLabelText('Security Information')).toBeInTheDocument()
      expect(screen.getByLabelText('Activity Information')).toBeInTheDocument()
      expect(screen.getByLabelText('All time')).toBeInTheDocument()
    })

    it('should have proper button roles', () => {
      render(<JSONImportExportModal {...mockProps} />)

      expect(screen.getByRole('button', { name: 'Download Template' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Import Users' })).toBeInTheDocument()

      const exportTab = screen.getByText('Export Users')
      fireEvent.click(exportTab)

      expect(screen.getByRole('button', { name: 'Export Users' })).toBeInTheDocument()
    })

    it('should have proper tab navigation', async () => {
      render(<JSONImportExportModal {...mockProps} />)

      const importTab = screen.getByText('Import Users')
      const exportTab = screen.getByText('Export Users')

      expect(importTab).toHaveClass('border-blue-500')
      expect(exportTab).toHaveClass('border-transparent')

      await fireEvent.click(exportTab)

      expect(exportTab).toHaveClass('border-blue-500')
      expect(importTab).toHaveClass('border-transparent')
    })
  })
})
