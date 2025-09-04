import type { ChartData, ChartConfig, ChartDrawing } from '@/domain/entities/Chart'

export interface ChartRepository {
  getChartData(symbol: string, interval: string, from: Date, to: Date): Promise<ChartData[]>
  saveChartConfig(userId: string, config: ChartConfig): Promise<void>
  getChartConfig(userId: string, symbol: string): Promise<ChartConfig | null>
  saveDrawings(userId: string, symbol: string, drawings: ChartDrawing[]): Promise<void>
  getDrawings(userId: string, symbol: string): Promise<ChartDrawing[]>
}
