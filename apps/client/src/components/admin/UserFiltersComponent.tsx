import React from 'react'
import AdvancedUserFilters, { UserFilters } from './AdvancedUserFilters'

interface BasicFilters {
  search: string
  role: string
  status: string
}

interface UserFiltersComponentProps {
  filters: BasicFilters
  advancedFiltersOpen: boolean
  onFilterChange: (key: string, value: string) => void
  onToggleAdvancedFilters: () => void
  onApplyAdvancedFilters: (filters: UserFilters) => void
  onClearAdvancedFilters: () => void
}

const UserFiltersComponent: React.FC<UserFiltersComponentProps> = ({
  filters,
  advancedFiltersOpen,
  onFilterChange,
  onToggleAdvancedFilters,
  onApplyAdvancedFilters,
  onClearAdvancedFilters,
}) => {
  return (
    <>
      {/* Advanced Filters */}
      <AdvancedUserFilters
        onApplyFilters={onApplyAdvancedFilters}
        onClearFilters={onClearAdvancedFilters}
        isOpen={advancedFiltersOpen}
        onToggle={onToggleAdvancedFilters}
      />

      {/* Basic Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Basic Filters
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Search
            </label>
            <input
              type='text'
              value={filters.search}
              onChange={e => onFilterChange('search', e.target.value)}
              placeholder='Search by email or name...'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Role
            </label>
            <select
              value={filters.role}
              onChange={e => onFilterChange('role', e.target.value)}
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
              onChange={e => onFilterChange('status', e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            >
              <option value=''>All Status</option>
              <option value='active'>Active</option>
              <option value='inactive'>Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </>
  )
}

export default UserFiltersComponent