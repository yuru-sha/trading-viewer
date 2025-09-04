import type { ChartRepository } from '@/domain/repositories/ChartRepository'
import type { ChartData, ChartConfig, ChartDrawing } from '@/domain/entities/Chart'

export class ApiChartRepository implements ChartRepository {
  constructor(private apiClient: ApiClient) {}

  async getChartData(symbol: string, interval: string, from: Date, to: Date): Promise<ChartData[]> {
    const params = new URLSearchParams({
      symbol,
      interval,
      from: from.toISOString(),
      to: to.toISOString(),
    })

    return await this.apiClient.get<ChartData[]>(`/market-data/chart?${params}`)
  }

  async saveChartConfig(userId: string, config: ChartConfig): Promise<void> {
    await this.apiClient.post(`/users/${userId}/chart-configs`, config)
  }

  async getChartConfig(userId: string, symbol: string): Promise<ChartConfig | null> {
    try {
      return await this.apiClient.get<ChartConfig>(`/users/${userId}/chart-configs/${symbol}`)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null
      }
      throw error
    }
  }

  async saveDrawings(userId: string, symbol: string, drawings: ChartDrawing[]): Promise<void> {
    await this.apiClient.put(`/users/${userId}/drawings/${symbol}`, { drawings })
  }

  async getDrawings(userId: string, symbol: string): Promise<ChartDrawing[]> {
    try {
      const response = await this.apiClient.get<{ drawings: ChartDrawing[] }>(
        `/users/${userId}/drawings/${symbol}`
      )
      return response.drawings
    } catch (error) {
      if (error instanceof NotFoundError) {
        return []
      }
      throw error
    }
  }
}

interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, data: unknown): Promise<T>
  put<T>(path: string, data: unknown): Promise<T>
  delete(path: string): Promise<void>
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
