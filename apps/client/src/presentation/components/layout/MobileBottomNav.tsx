import React from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/presentation/components/Icon'

interface NavigationItem {
  name: string
  href: string
  current: boolean
  iconName: 'heart' | 'trending' | 'chart' | 'search' | 'bell' | 'users'
}

interface MobileBottomNavProps {
  navigation: NavigationItem[]
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ navigation }) => {
  return (
    <nav
      className='lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb'
      role='navigation'
      aria-label='Bottom navigation'
    >
      <div className='grid grid-cols-5 h-16'>
        {navigation.map(item =>
          item.name === 'Charts' ? (
            <button
              key={item.name}
              onClick={() => window.open(item.href, '_blank')}
              className={`${
                item.current
                  ? 'text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              } flex flex-col items-center justify-center space-y-1 transition-colors duration-200`}
              aria-current={item.current ? 'page' : undefined}
              aria-label={`${item.name} - Bottom navigation`}
            >
              <Icon name={item.iconName} className='w-5 h-5' />
              <span className='text-xs font-medium truncate'>{item.name}</span>
            </button>
          ) : (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                item.current
                  ? 'text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              } flex flex-col items-center justify-center space-y-1 transition-colors duration-200`}
              aria-current={item.current ? 'page' : undefined}
              aria-label={`${item.name} - Bottom navigation`}
            >
              <Icon name={item.iconName} className='w-5 h-5' />
              <span className='text-xs font-medium truncate'>{item.name}</span>
            </Link>
          )
        )}
      </div>
    </nav>
  )
}
