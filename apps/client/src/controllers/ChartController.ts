import type { LoadChartData } from '@/application/use-cases/chart/LoadChartData'
import type { ChartService } from '@/application/services/ChartService'

export class ChartController {
  constructor(
    private loadChartData: LoadChartData,
    private chartService: ChartService
  ) {}

  async getChartData(params: {
    symbol: string
    interval: string
    from: Date
    to: Date
    userId?: string
  }) {
    try {
      return await this.loadChartData.execute(params)
    } catch (error) {
      throw new Error(
        `Failed to load chart data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async saveChartLayout(userId: string, config: any) {
    try {
      await this.chartService.saveChartLayout(userId, config)
    } catch (error) {
      throw new Error(
        `Failed to save chart layout: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async addDrawing(userId: string, symbol: string, drawing: any) {
    try {
      await this.chartService.addDrawing(userId, symbol, drawing)
    } catch (error) {
      throw new Error(
        `Failed to add drawing: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async removeDrawing(userId: string, symbol: string, drawingId: string) {
    try {
      await this.chartService.removeDrawing(userId, symbol, drawingId)
    } catch (error) {
      throw new Error(
        `Failed to remove drawing: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async updateDrawing(userId: string, symbol: string, drawingId: string, updates: any) {
    try {
      await this.chartService.updateDrawing(userId, symbol, drawingId, updates)
    } catch (error) {
      throw new Error(
        `Failed to update drawing: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
