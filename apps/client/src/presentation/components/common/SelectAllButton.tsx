import React from 'react'

interface SelectAllButtonProps {
  totalCount: number
  selectedCount: number
  onToggle: () => void
  className?: string
}

const SelectAllButton: React.FC<SelectAllButtonProps> = ({
  totalCount,
  selectedCount,
  onToggle,
  className = '',
}) => {
  const isAllSelected = selectedCount === totalCount && totalCount > 0

  if (totalCount === 0) return null

  return (
    <button
      onClick={onToggle}
      className={`flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 ${className}`}
    >
      <div
        className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
          isAllSelected
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {isAllSelected && (
          <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        )}
      </div>
      <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
    </button>
  )
}

export default SelectAllButton
