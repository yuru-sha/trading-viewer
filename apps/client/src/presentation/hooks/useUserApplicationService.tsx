import { useMemo } from 'react'
import {
  UserApplicationService,
  AuthenticationApplicationService,
} from '@/application/services/UserApplicationService'
import { ApiUserRepository } from '@/infrastructure/repositories/ApiUserRepository'

/**
 * Clean Architecture 準拠のユーザーアプリケーションサービスを提供するフック
 */
export const useUserApplicationService = () => {
  const services = useMemo(() => {
    // Infrastructure層のリポジトリ
    const userRepository = new ApiUserRepository()

    // Application層のサービス
    const userService = new UserApplicationService(userRepository)
    const authService = new AuthenticationApplicationService(userRepository)

    return {
      userService,
      authService,
    }
  }, [])

  return services
}
