// Dependency Injection Container
import type { UserRepository } from '@/domain/repositories/UserRepository'
import type { ChartRepository } from '@/domain/repositories/ChartRepository'
import type { MarketDataRepository } from '@/domain/repositories/MarketDataRepository'
import type { ChartAnalysisService } from '@/domain/services/ChartAnalysisService'
import type { WebSocketPort } from '@/application/ports/WebSocketPort'
import type { IAuthService } from '@/domain/interfaces/IAuthService'

import {
  ApiUserRepository,
  ApiChartRepository,
  ApiMarketDataRepository,
} from '@/infrastructure/repositories'
import { ChartAnalysisServiceImpl, AuthServiceImpl } from '@/infrastructure/services'
import { WebSocketAdapter } from '@/infrastructure/websocket/WebSocketAdapter'
import { tradingViewerApiClient } from '@/infrastructure/api/TradingViewerApiClient'
import { ApiService } from '@/infrastructure/api/ApiService'

import { AuthenticateUser } from '@/application/use-cases/auth/AuthenticateUser'
import { LoadChartData } from '@/application/use-cases/chart/LoadChartData'
import { CreateAlert } from '@/application/use-cases/market/CreateAlert'
import { ChartService } from '@/application/services/ChartService'

// Simple DI Container
class DIContainer {
  private instances = new Map<string, unknown>()

  // Register instances
  register<T>(key: string, instance: T): void {
    this.instances.set(key, instance)
  }

  // Resolve instances
  resolve<T>(key: string): T {
    const instance = this.instances.get(key)
    if (!instance) {
      throw new Error(`No instance registered for key: ${key}`)
    }
    return instance as T
  }
}

// Create container and register dependencies
export const container = new DIContainer()

// Infrastructure layer
const apiService = new ApiService(import.meta.env.VITE_API_URL || 'http://localhost:8000/api')

container.register('apiService', apiService)
container.register('apiClient', tradingViewerApiClient)
container.register('userRepository', new ApiUserRepository(tradingViewerApiClient))
container.register('chartRepository', new ApiChartRepository(tradingViewerApiClient))
container.register('marketDataRepository', new ApiMarketDataRepository(tradingViewerApiClient))
container.register('chartAnalysisService', new ChartAnalysisServiceImpl())
container.register('authService', new AuthServiceImpl(apiService))
container.register('webSocketPort', new WebSocketAdapter())

// Application layer - Use cases
container.register(
  'authenticateUser',
  new AuthenticateUser(
    container.resolve<UserRepository>('userRepository'),
    container.resolve<IAuthService>('authService')
  )
)

container.register(
  'loadChartData',
  new LoadChartData(
    container.resolve<ChartRepository>('chartRepository'),
    container.resolve<ChartAnalysisService>('chartAnalysisService')
  )
)

container.register(
  'createAlert',
  new CreateAlert(container.resolve<MarketDataRepository>('marketDataRepository'))
)

// Application layer - Services
container.register(
  'chartService',
  new ChartService(container.resolve<ChartRepository>('chartRepository'))
)

// Export convenience functions
export const getApiService = () => container.resolve<ApiService>('apiService')
export const getAuthService = () => container.resolve<IAuthService>('authService')
export const getUserRepository = () => container.resolve<UserRepository>('userRepository')
export const getChartRepository = () => container.resolve<ChartRepository>('chartRepository')
export const getMarketDataRepository = () =>
  container.resolve<MarketDataRepository>('marketDataRepository')
export const getChartAnalysisService = () =>
  container.resolve<ChartAnalysisService>('chartAnalysisService')
export const getWebSocketPort = () => container.resolve<WebSocketPort>('webSocketPort')

export const getAuthenticateUser = () => container.resolve<AuthenticateUser>('authenticateUser')
export const getLoadChartData = () => container.resolve<LoadChartData>('loadChartData')
export const getCreateAlert = () => container.resolve<CreateAlert>('createAlert')
export const getChartService = () => container.resolve<ChartService>('chartService')

// Controllers
import { AuthController } from '@/infrastructure/../controllers/AuthController'
import { ChartController } from '@/infrastructure/../controllers/ChartController'

container.register(
  'authController',
  new AuthController(container.resolve<AuthenticateUser>('authenticateUser'))
)

container.register(
  'chartController',
  new ChartController(
    container.resolve<LoadChartData>('loadChartData'),
    container.resolve<ChartService>('chartService')
  )
)

export const getAuthController = () => container.resolve<AuthController>('authController')
export const getChartController = () => container.resolve<ChartController>('chartController')
