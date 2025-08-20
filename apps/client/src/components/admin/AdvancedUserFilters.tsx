import React, { useState } from 'react'
import { Button, Input } from '@trading-viewer/ui'

interface AdvancedUserFiltersProps {
  onApplyFilters: (filters: UserFilters) => void
  onClearFilters: () => void
  isOpen: boolean
  onToggle: () => void
}

export interface UserFilters {
  search: string
  role: string
  status: string
  emailVerified: string
  department: string
  lastLoginStart: string
  lastLoginEnd: string
  createdStart: string
  createdEnd: string
  failedLoginCount: {
    operator: 'gt' | 'lt' | 'eq'
    value: number | null
  }
  hasActiveSession: string
  isLocked: string
  timezone: string
  language: string
}

const AdvancedUserFilters: React.FC<AdvancedUserFiltersProps> = ({
  onApplyFilters,
  onClearFilters,
  isOpen,
  onToggle,
}) => {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    status: '',
    emailVerified: '',
    department: '',
    lastLoginStart: '',
    lastLoginEnd: '',
    createdStart: '',
    createdEnd: '',
    failedLoginCount: {
      operator: 'gt',
      value: null,
    },
    hasActiveSession: '',
    isLocked: '',
    timezone: '',
    language: '',
  })

  const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'Finance',
    'Human Resources',
    'Operations',
    'Customer Support',
    'Design',
    'Product',
    'Legal',
  ]

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ]

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ]

  const handleFilterChange = (key: keyof UserFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleFailedLoginCountChange = (field: 'operator' | 'value', value: unknown) => {
    setFilters(prev => ({
      ...prev,
      failedLoginCount: {
        ...prev.failedLoginCount,
        [field]: value,
      },
    }))
  }

  const handleApplyFilters = () => {
    onApplyFilters(filters)
  }

  const handleClearFilters = () => {
    const clearedFilters: UserFilters = {
      search: '',
      role: '',
      status: '',
      emailVerified: '',
      department: '',
      lastLoginStart: '',
      lastLoginEnd: '',
      createdStart: '',
      createdEnd: '',
      failedLoginCount: {
        operator: 'gt',
        value: null,
      },
      hasActiveSession: '',
      isLocked: '',
      timezone: '',
      language: '',
    }
    setFilters(clearedFilters)
    onClearFilters()
  }

  const hasActiveFilters = () => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'failedLoginCount') {
        return value.value !== null
      }
      return value !== ''
    })
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md'>
      <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            User Filters
            {hasActiveFilters() && (
              <span className='ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                Active
              </span>
            )}
          </h2>
          <div className='flex items-center space-x-2'>
            <Button onClick={onToggle} variant='secondary' size='sm'>
              {isOpen ? 'Hide Filters' : 'Show Advanced Filters'}
            </Button>
            {hasActiveFilters() && (
              <Button onClick={handleClearFilters} variant='secondary' size='sm'>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className='p-6 space-y-6'>
          {/* Basic Filters */}
          <div>
            <h3 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
              Basic Filters
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Search
                </label>
                <Input
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  placeholder='Name, email, or ID...'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Role
                </label>
                <select
                  value={filters.role}
                  onChange={e => handleFilterChange('role', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All Roles</option>
                  <option value='admin'>Admin</option>
                  <option value='user'>User</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={e => handleFilterChange('status', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All Status</option>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Email Verified
                </label>
                <select
                  value={filters.emailVerified}
                  onChange={e => handleFilterChange('emailVerified', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All</option>
                  <option value='true'>Verified</option>
                  <option value='false'>Not Verified</option>
                </select>
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div>
            <h3 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
              Work Information
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Department
                </label>
                <select
                  value={filters.department}
                  onChange={e => handleFilterChange('department', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div>
            <h3 className='text-md font-medium text-gray-900 dark:text-white mb-3'>Date Filters</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Last Login From
                </label>
                <Input
                  type='date'
                  value={filters.lastLoginStart}
                  onChange={e => handleFilterChange('lastLoginStart', e.target.value)}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Last Login To
                </label>
                <Input
                  type='date'
                  value={filters.lastLoginEnd}
                  onChange={e => handleFilterChange('lastLoginEnd', e.target.value)}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Created From
                </label>
                <Input
                  type='date'
                  value={filters.createdStart}
                  onChange={e => handleFilterChange('createdStart', e.target.value)}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Created To
                </label>
                <Input
                  type='date'
                  value={filters.createdEnd}
                  onChange={e => handleFilterChange('createdEnd', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Security Filters */}
          <div>
            <h3 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
              Security Filters
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Failed Login Count
                </label>
                <div className='flex space-x-2'>
                  <select
                    value={filters.failedLoginCount.operator}
                    onChange={e => handleFailedLoginCountChange('operator', e.target.value)}
                    className='w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm'
                  >
                    <option value='gt'>{'>'}</option>
                    <option value='lt'>{'<'}</option>
                    <option value='eq'>{'='}</option>
                  </select>
                  <Input
                    type='number'
                    value={filters.failedLoginCount.value || ''}
                    onChange={e =>
                      handleFailedLoginCountChange(
                        'value',
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder='0'
                    className='flex-1'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Account Locked
                </label>
                <select
                  value={filters.isLocked}
                  onChange={e => handleFilterChange('isLocked', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All</option>
                  <option value='true'>Locked</option>
                  <option value='false'>Not Locked</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Has Active Session
                </label>
                <select
                  value={filters.hasActiveSession}
                  onChange={e => handleFilterChange('hasActiveSession', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All</option>
                  <option value='true'>Has Active Session</option>
                  <option value='false'>No Active Session</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className='text-md font-medium text-gray-900 dark:text-white mb-3'>
              User Preferences
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Timezone
                </label>
                <select
                  value={filters.timezone}
                  onChange={e => handleFilterChange('timezone', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All Timezones</option>
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Language
                </label>
                <select
                  value={filters.language}
                  onChange={e => handleFilterChange('language', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                >
                  <option value=''>All Languages</option>
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <Button onClick={handleClearFilters} variant='secondary'>
              Clear All
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedUserFilters
