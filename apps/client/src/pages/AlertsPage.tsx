import React from 'react'

const AlertsPage: React.FC = () => {
  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Alerts</h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Manage your price alerts and notifications
        </p>
      </div>

      <div className='mt-8'>
        <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
          <h2 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>Coming Soon</h2>
          <p className='text-gray-600 dark:text-gray-400'>
            Alerts functionality will be implemented in a future update.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AlertsPage
