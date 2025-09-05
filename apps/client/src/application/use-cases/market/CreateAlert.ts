import type { MarketDataRepository } from '@/domain/repositories/MarketDataRepository'
import type { Alert, AlertCondition } from '@/domain/entities/MarketData'

export type CreateAlertRequest = {
  userId: string
  symbol: string
  condition: AlertCondition
  targetPrice: number
}

export type CreateAlertResponse = {
  alert: Alert
}

export class CreateAlert {
  constructor(private marketDataRepository: MarketDataRepository) {}

  async execute(request: CreateAlertRequest): Promise<CreateAlertResponse> {
    // Validate target price
    if (request.targetPrice <= 0) {
      throw new Error('Target price must be greater than 0')
    }

    // Validate symbol exists
    const symbols = await this.marketDataRepository.searchSymbols(request.symbol)
    const symbol = symbols.find(s => s.symbol === request.symbol)

    if (!symbol) {
      throw new Error('Symbol not found')
    }

    const alert = await this.marketDataRepository.createAlert(request.userId, {
      symbol: request.symbol,
      condition: request.condition,
      targetPrice: request.targetPrice,
      isActive: true,
    })

    return {
      alert,
    }
  }
}
