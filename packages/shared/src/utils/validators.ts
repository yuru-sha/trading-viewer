import type { Timeframe } from '../types/chart'

export const isValidSymbol = (symbol: string): boolean => {
  return /^[A-Z]{1,5}$/.test(symbol)
}

export const isValidTimeframe = (timeframe: string): timeframe is Timeframe => {
  return ['1', '5', '15', '30', '60', 'D', 'W', 'M'].includes(timeframe)
}

export const isValidTimestamp = (timestamp: number): boolean => {
  return timestamp > 0 && timestamp <= Date.now() / 1000
}

export const isValidPrice = (price: number): boolean => {
  return price > 0 && isFinite(price)
}

export const isValidVolume = (volume: number): boolean => {
  return volume >= 0 && isFinite(volume)
}

export const sanitizeSymbol = (symbol: string): string => {
  return symbol.toUpperCase().trim()
}
