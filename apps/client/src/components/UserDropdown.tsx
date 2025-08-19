import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from './Icon'

interface UserDropdownProps {
  onboardingId?: string
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ onboardingId }) => {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  if (!user) return null

  const displayName = user.name || user.email.split('@')[0]

  return (
    <div className='relative' ref={dropdownRef} id={onboardingId}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className='flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
        aria-expanded={isOpen}
        aria-haspopup='true'
        aria-label='User menu'
      >
        {/* User Avatar or Icon */}
        <div className='w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center'>
          {user.profile?.avatar ? (
            <img src={user.profile.avatar} alt={displayName} className='w-8 h-8 rounded-full' />
          ) : (
            <span className='text-white font-semibold text-sm'>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* User Name */}
        <span className='hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300'>
          {displayName}
        </span>

        {/* Dropdown Arrow */}
        <Icon
          name='down'
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className='absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50'
          role='menu'
          aria-orientation='vertical'
          aria-labelledby='user-menu-button'
        >
          {/* User Info */}
          <div className='px-4 py-3 border-b border-gray-200 dark:border-gray-700'>
            <p className='text-sm font-medium text-gray-900 dark:text-white'>{displayName}</p>
            <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>{user.email}</p>
            {user.role === 'admin' && (
              <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-2'>
                Admin
              </span>
            )}
          </div>

          {/* Menu Items */}
          <div className='py-1'>
            <Link
              to='/settings'
              onClick={() => setIsOpen(false)}
              className='flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150'
              role='menuitem'
            >
              <Icon name='settings' className='w-4 h-4 mr-3' />
              Settings
            </Link>

            {user.role === 'admin' && (
              <Link
                to='/admin/users'
                onClick={() => setIsOpen(false)}
                className='flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150'
                role='menuitem'
              >
                <Icon name='users' className='w-4 h-4 mr-3' />
                User Management
              </Link>
            )}

            <Link
              to='/help'
              onClick={() => setIsOpen(false)}
              className='flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150'
              role='menuitem'
            >
              <Icon name='help' className='w-4 h-4 mr-3' />
              Help
            </Link>
          </div>

          {/* Logout */}
          <div className='border-t border-gray-200 dark:border-gray-700 py-1'>
            <button
              onClick={async () => {
                setIsOpen(false)
                await logout()
              }}
              className='flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150'
              role='menuitem'
            >
              <Icon name='logout' className='w-4 h-4 mr-3' />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDropdown
