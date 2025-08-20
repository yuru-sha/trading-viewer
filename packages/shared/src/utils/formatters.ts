/**
 * 価格を指定された小数点以下の桁数でフォーマットします。
 * @param price - フォーマットする価格
 * @param decimals - 小数点以下の桁数 (デフォルトは2)
 * @returns フォーマットされた価格文字列
 */
export const formatPrice = (price: number, decimals: number = 2): string => {
  return price.toFixed(decimals)
}

/**
 * 価格の変動を符号付きでフォーマットします。
 * @param change - フォーマットする価格変動
 * @param decimals - 小数点以下の桁数 (デフォルトは2)
 * @returns フォーマットされた価格変動文字列
 */
export const formatPriceChange = (change: number, decimals: number = 2): string => {
  const formatted = change.toFixed(decimals)
  return change > 0 ? `+${formatted}` : formatted
}

/**
 * パーセンテージを符号とパーセント記号付きでフォーマットします。
 * @param percentage - フォーマットするパーセンテージ
 * @param decimals - 小数点以下の桁数 (デフォルトは2)
 * @returns フォーマットされたパーセンテージ文字列
 */
export const formatPercentage = (percentage: number, decimals: number = 2): string => {
  const formatted = percentage.toFixed(decimals)
  return `${percentage > 0 ? '+' : ''}${formatted}%`
}

/**
 * 出来高をB(十億)、M(百万)、K(千)の単位に短縮してフォーマットします。
 * @param volume - フォーマットする出来高
 * @returns フォーマットされた出来高文字列
 */
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

/**
 * Unixタイムスタンプを指定された形式の日時文字列にフォーマットします。
 * @param timestamp - フォーマットするUnixタイムスタンプ (秒単位)
 * @param format - フォーマット形式 ('time', 'datetime', 'date') (デフォルトは 'datetime')
 * @returns フォーマットされた日時文字列
 */
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

/**
 * 銘柄シンボルを大文字にフォーマットします。
 * @param symbol - フォーマットする銘柄シンボル
 * @returns 大文字に変換された銘柄シンボル
 */
export const formatSymbol = (symbol: string): string => {
  return symbol.toUpperCase()
}
