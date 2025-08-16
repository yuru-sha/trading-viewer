import React, { useState, useRef } from 'react'
import { Modal, Button, Input } from '@trading-viewer/ui'
import { useError } from '../../contexts/ErrorContext'
import { apiService } from '../../services/base/ApiService'
import type { ImportResult, ExportOptions } from '@shared'

interface CSVImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

interface LocalExportOptions extends ExportOptions {
  includeSecurityInfo: boolean
  includeActivityInfo: boolean
  dateRange: 'all' | 'last30' | 'last90' | 'custom'
  customStartDate?: string
  customEndDate?: string
}

const CSVImportExportModal: React.FC<CSVImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [exportOptions, setExportOptions] = useState<LocalExportOptions>({
    includePersonalInfo: false,
    includeWorkInfo: false,
    includePreferences: false,
    includeSecurityInfo: false,
    includeActivityInfo: true,
    dateRange: 'all',
    format: 'csv',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showError, showSuccess } = useError()

  const csvTemplate = `email,role,isActive,password
user1@example.com,user,true,SecurePass123@
user2@example.com,user,true,SecurePass123@
admin@example.com,admin,true,AdminPass123@`

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showError('Please select a CSV file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        showError('File size must be less than 10MB')
        return
      }
      setImportFile(file)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      showError('Please select a CSV file to import')
      return
    }

    const formData = new FormData()
    formData.append('file', importFile)

    try {
      setImporting(true)
      setImportResult(null)

      const response = await apiService.post<{ success: boolean; data: ImportResult }>(
        '/auth/users/import',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (response.success) {
        setImportResult(response.data)
        if (response.data.failedImports === 0) {
          showSuccess(`Successfully imported ${response.data.successfulImports} users`)
          onImportComplete()
        } else {
          showError(`Import completed with ${response.data.failedImports} errors`)
        }
      }
    } catch (error: any) {
      console.error('Failed to import users:', error)
      if (error.response?.data?.message) {
        showError(error.response.data.message)
      } else {
        showError('Failed to import users')
      }
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)

      const params = new URLSearchParams({
        includePersonalInfo: exportOptions.includePersonalInfo.toString(),
        includeWorkInfo: exportOptions.includeWorkInfo.toString(),
        includeSecurityInfo: exportOptions.includeSecurityInfo.toString(),
        includeActivityInfo: exportOptions.includeActivityInfo.toString(),
        dateRange: exportOptions.dateRange,
        format: exportOptions.format,
      })

      if (exportOptions.dateRange === 'custom') {
        if (exportOptions.customStartDate) {
          params.append('startDate', exportOptions.customStartDate)
        }
        if (exportOptions.customEndDate) {
          params.append('endDate', exportOptions.customEndDate)
        }
      }

      const response = await apiService.get(`/auth/users/export?${params.toString()}`, {
        responseType: 'blob',
      })

      // Create download link
      const blob = new Blob([response.data], {
        type:
          exportOptions.format === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.${exportOptions.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showSuccess('Users exported successfully')
    } catch (error) {
      console.error('Failed to export users:', error)
      showError('Failed to export users')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user_import_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleClearFile = () => {
    setImportFile(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleClearFile()
    onClose()
  }

  const updateExportOption = <K extends keyof LocalExportOptions>(
    key: K,
    value: LocalExportOptions[K]
  ) => {
    setExportOptions(prev => ({ ...prev, [key]: value }))
  }

  const renderImportTab = () => (
    <div className='space-y-6'>
      {/* Template Download */}
      <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
        <div className='flex items-start justify-between'>
          <div>
            <h4 className='text-sm font-medium text-blue-800 dark:text-blue-200'>CSV Template</h4>
            <p className='text-sm text-blue-700 dark:text-blue-300 mt-1'>
              Download the template file to see the required format for user imports.
            </p>
          </div>
          <Button onClick={handleDownloadTemplate} variant='secondary' size='sm'>
            Download Template
          </Button>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          Select CSV File
        </label>
        <div className='flex items-center space-x-3'>
          <input
            ref={fileInputRef}
            type='file'
            accept='.csv'
            onChange={handleFileSelect}
            className='block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
          />
          {importFile && (
            <Button onClick={handleClearFile} variant='secondary' size='sm'>
              Clear
            </Button>
          )}
        </div>
        {importFile && (
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-2'>
            Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Import Instructions */}
      <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
        <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>
          Import Instructions
        </h4>
        <ul className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
          <li>• File must be in CSV format with headers</li>
          <li>• Email addresses must be unique and valid</li>
          <li>• Required fields: email, role</li>
          <li>• Role must be either 'admin' or 'user'</li>
          <li>• isActive must be 'true' or 'false'</li>
          <li>• Maximum file size: 10MB</li>
          <li>• Existing users will be updated</li>
        </ul>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className='space-y-4'>
          <div className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg'>
            <h4 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
              Import Results
            </h4>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {importResult.totalRows}
                </div>
                <div className='text-sm text-gray-600 dark:text-gray-400'>Total Rows</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                  {importResult.successfulImports}
                </div>
                <div className='text-sm text-gray-600 dark:text-gray-400'>Successful</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-red-600 dark:text-red-400'>
                  {importResult.failedImports}
                </div>
                <div className='text-sm text-gray-600 dark:text-gray-400'>Failed</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-yellow-600 dark:text-yellow-400'>
                  {importResult.warnings.length}
                </div>
                <div className='text-sm text-gray-600 dark:text-gray-400'>Warnings</div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
              <h5 className='text-sm font-medium text-red-800 dark:text-red-200 mb-2'>
                Import Errors ({importResult.errors.length})
              </h5>
              <div className='max-h-40 overflow-y-auto space-y-2'>
                {importResult.errors.map((error, index) => (
                  <div key={index} className='text-sm text-red-700 dark:text-red-300'>
                    Row {error.row}: {error.field} = "{error.value}" - {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {importResult.warnings.length > 0 && (
            <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
              <h5 className='text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2'>
                Warnings ({importResult.warnings.length})
              </h5>
              <div className='max-h-40 overflow-y-auto space-y-1'>
                {importResult.warnings.map((warning, index) => (
                  <div key={index} className='text-sm text-yellow-700 dark:text-yellow-300'>
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      <div className='flex justify-end'>
        <Button onClick={handleImport} disabled={!importFile || importing}>
          {importing ? 'Importing...' : 'Import Users'}
        </Button>
      </div>
    </div>
  )

  const renderExportTab = () => (
    <div className='space-y-6'>
      {/* Export Options */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-white mb-3'>Export Options</h4>

        {/* Data Inclusion */}
        <div className='space-y-3 mb-4'>
          <h5 className='text-sm font-medium text-gray-700 dark:text-gray-300'>Include Data</h5>
          <div className='space-y-2'>
            {[
              {
                key: 'includeSecurityInfo',
                label: 'Security Information',
                description: 'Login attempts, account locks',
              },
              {
                key: 'includeActivityInfo',
                label: 'Activity Information',
                description: 'Last login, creation date',
              },
            ].map(option => (
              <label key={option.key} className='flex items-start space-x-3'>
                <input
                  type='checkbox'
                  checked={exportOptions[option.key as keyof LocalExportOptions] as boolean}
                  onChange={e =>
                    updateExportOption(option.key as keyof LocalExportOptions, e.target.checked)
                  }
                  className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                />
                <div>
                  <div className='text-sm font-medium text-gray-900 dark:text-white'>
                    {option.label}
                  </div>
                  <div className='text-xs text-gray-600 dark:text-gray-400'>
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className='space-y-3 mb-4'>
          <h5 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            Date Range (for activity data)
          </h5>
          <div className='space-y-2'>
            {[
              { value: 'all', label: 'All time' },
              { value: 'last30', label: 'Last 30 days' },
              { value: 'last90', label: 'Last 90 days' },
              { value: 'custom', label: 'Custom range' },
            ].map(option => (
              <label key={option.value} className='flex items-center space-x-2'>
                <input
                  type='radio'
                  name='dateRange'
                  value={option.value}
                  checked={exportOptions.dateRange === option.value}
                  onChange={e => updateExportOption('dateRange', e.target.value as any)}
                  className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300'
                />
                <span className='text-sm text-gray-900 dark:text-white'>{option.label}</span>
              </label>
            ))}
          </div>

          {exportOptions.dateRange === 'custom' && (
            <div className='grid grid-cols-2 gap-3 mt-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Start Date
                </label>
                <Input
                  type='date'
                  value={exportOptions.customStartDate || ''}
                  onChange={e => updateExportOption('customStartDate', e.target.value)}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  End Date
                </label>
                <Input
                  type='date'
                  value={exportOptions.customEndDate || ''}
                  onChange={e => updateExportOption('customEndDate', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Format */}
        <div className='space-y-3'>
          <h5 className='text-sm font-medium text-gray-700 dark:text-gray-300'>Export Format</h5>
          <div className='space-y-2'>
            {[
              {
                value: 'csv',
                label: 'CSV (Comma Separated Values)',
                description: 'Compatible with Excel, Google Sheets',
              },
              {
                value: 'xlsx',
                label: 'Excel (XLSX)',
                description: 'Native Excel format with formatting',
              },
            ].map(option => (
              <label key={option.value} className='flex items-start space-x-2'>
                <input
                  type='radio'
                  name='format'
                  value={option.value}
                  checked={exportOptions.format === option.value}
                  onChange={e => updateExportOption('format', e.target.value as any)}
                  className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300'
                />
                <div>
                  <div className='text-sm font-medium text-gray-900 dark:text-white'>
                    {option.label}
                  </div>
                  <div className='text-xs text-gray-600 dark:text-gray-400'>
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className='flex justify-end'>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export Users'}
        </Button>
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='CSV Import/Export'>
      <div className='max-w-2xl'>
        {/* Tabs */}
        <div className='border-b border-gray-200 dark:border-gray-700 mb-6'>
          <nav className='-mb-px flex space-x-8'>
            {[
              { id: 'import', label: 'Import Users', icon: '📥' },
              { id: 'export', label: 'Export Users', icon: '📤' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'import' && renderImportTab()}
          {activeTab === 'export' && renderExportTab()}
        </div>
      </div>
    </Modal>
  )
}

export default CSVImportExportModal
