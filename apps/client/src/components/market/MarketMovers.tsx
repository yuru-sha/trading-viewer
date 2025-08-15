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

interface MarketMoversProps {
  gainers: Asset[]
  losers: Asset[]
  mostActive: Asset[]
  loading?: boolean
  onAssetClick?: (symbol: string) => void
}

export const MarketMovers: React.FC<MarketMoversProps> = ({
  gainers,
  losers,
  mostActive,
  loading = false,
  onAssetClick
}) => {
  const renderAssetGrid = (assets: Asset[], title: string, bgColor: string) => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">({assets.length})</span>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset, index) => (
            <div
              key={asset.symbol}
              onClick={() => onAssetClick?.(asset.symbol)}
              className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                  {index + 1}
                </span>
                <div className="flex items-center space-x-3">
                  {asset.logo && (
                    <img
                      src={asset.logo}
                      alt={asset.symbol}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {asset.symbol}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                      {asset.name}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  ${asset.price.toFixed(2)}
                </div>
                <div className={`text-xs font-medium ${
                  asset.changePercent >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
        View all {title.toLowerCase()} →
      </button>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {renderAssetGrid(gainers, 'Top Gainers', 'bg-green-500')}
      {renderAssetGrid(losers, 'Top Losers', 'bg-red-500')}
      {renderAssetGrid(mostActive, 'Most Active', 'bg-blue-500')}
    </div>
  )
}