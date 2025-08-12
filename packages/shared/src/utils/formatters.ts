export const formatPrice = (price: number, decimals: number = 2): string => {
  return price.toFixed(decimals)
}

export const formatPriceChange = (change: number, decimals: number = 2): string => {
  const formatted = change.toFixed(decimals)
  return change > 0 ? `+${formatted}` : formatted
}

export const formatPercentage = (percentage: number, decimals: number = 2): string => {
  const formatted = percentage.toFixed(decimals)
  return `${percentage > 0 ? '+' : ''}${formatted}%`
}

export const formatVolume = (volume: number): string => {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(1)}B`
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`
  }
  return volume.toString()
}

export const formatTimestamp = (
  timestamp: number,
  format: 'time' | 'datetime' | 'date' = 'datetime'
): string => {
  const date = new Date(timestamp * 1000)

  switch (format) {
    case 'time':
      return date.toLocaleTimeString()
    case 'date':
      return date.toLocaleDateString()
    case 'datetime':
    default:
      return date.toLocaleString()
  }
}

export const formatSymbol = (symbol: string): string => {
  return symbol.toUpperCase()
}
