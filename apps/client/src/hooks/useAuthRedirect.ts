import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * セッション切れ時の自動ログイン画面遷移フック
 * 認証が必要なページで使用し、セッション切れ時に自動的にログイン画面にリダイレクトする
 */
export const useAuthRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // ローディング完了後、非認証状態の場合はログイン画面にリダイレクト
    if (!isLoading && !isAuthenticated) {
      console.log('🔒 Session expired, redirecting to login...')
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  return { isAuthenticated, isLoading }
}
