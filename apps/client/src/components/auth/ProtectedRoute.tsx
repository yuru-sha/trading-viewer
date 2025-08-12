import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireRole?: 'user' | 'admin'
  fallback?: React.ReactNode
  redirectTo?: string
  showLoadingSpinner?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireRole,
  fallback,
  redirectTo = '/login',
  showLoadingSpinner = true,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        setShouldRedirect(true)
      } else if (requireRole && user && user.role !== requireRole) {
        setShouldRedirect(true)
      }
    }
  }, [isLoading, isAuthenticated, user, requireAuth, requireRole])

  useEffect(() => {
    if (shouldRedirect) {
      // In a real app, you'd use React Router or Next.js router
      // For now, we'll redirect using window.location
      if (requireRole && user && user.role !== requireRole) {
        // Redirect to forbidden page or home
        window.location.href = '/forbidden'
      } else {
        window.location.href = redirectTo
      }
    }
  }, [shouldRedirect, redirectTo, requireRole, user])

  if (isLoading) {
    if (showLoadingSpinner) {
      return (
        <div className='min-h-screen flex items-center justify-center'>
          <LoadingSpinner size='large' />
        </div>
      )
    }
    return null
  }

  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  if (requireRole && user && user.role !== requireRole) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>アクセス権限がありません</h1>
          <p className='text-gray-600'>このページにアクセスするための権限がありません。</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
