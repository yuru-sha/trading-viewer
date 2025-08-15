import React from 'react'
import { AssetCard } from './AssetCard'

interface Asset {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  logo?: string
  volume?: number
  marketCap?: number
}

interface HorizontalAssetListProps {
  assets: Asset[]
  loading?: boolean
  onAssetClick?: (symbol: string) => void
}

export const HorizontalAssetList: React.FC<HorizontalAssetListProps> = ({
  assets,
  loading = false,
  onAssetClick
}) => {
  if (loading) {
    return (
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-w-[240px] animate-pulse"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
      {assets.map((asset) => (
        <AssetCard
          key={asset.symbol}
          {...asset}
          onClick={() => onAssetClick?.(asset.symbol)}
        />
      ))}
    </div>
  )
}