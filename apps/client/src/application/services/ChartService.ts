import type { ChartRepository } from '@/domain/repositories/ChartRepository'
import type { ChartConfig, ChartDrawing } from '@/domain/entities/Chart'

export class ChartService {
  constructor(private chartRepository: ChartRepository) {}

  async saveChartLayout(userId: string, config: ChartConfig): Promise<void> {
    await this.chartRepository.saveChartConfig(userId, config)
  }

  async addDrawing(userId: string, symbol: string, drawing: ChartDrawing): Promise<void> {
    const existingDrawings = await this.chartRepository.getDrawings(userId, symbol)
    const updatedDrawings = [...existingDrawings, drawing]
    await this.chartRepository.saveDrawings(userId, symbol, updatedDrawings)
  }

  async removeDrawing(userId: string, symbol: string, drawingId: string): Promise<void> {
    const existingDrawings = await this.chartRepository.getDrawings(userId, symbol)
    const updatedDrawings = existingDrawings.filter(d => d.id !== drawingId)
    await this.chartRepository.saveDrawings(userId, symbol, updatedDrawings)
  }

  async updateDrawing(
    userId: string,
    symbol: string,
    drawingId: string,
    updates: Partial<ChartDrawing>
  ): Promise<void> {
    const existingDrawings = await this.chartRepository.getDrawings(userId, symbol)
    const updatedDrawings = existingDrawings.map(drawing =>
      drawing.id === drawingId ? { ...drawing, ...updates } : drawing
    )
    await this.chartRepository.saveDrawings(userId, symbol, updatedDrawings)
  }
}
