import React, { useState, useEffect } from 'react'
import { Button, Loading } from '@trading-viewer/ui'
import { useApp, useAppActions } from '../contexts/AppContext'
import { apiService } from '../services/base/ApiService'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface QuoteData {
  symbol: string
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  marketCap?: number
  timestamp: number
}

interface WatchlistItem {
  id: string
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: string
  marketCap: string
  addedAt: Date
}

interface SortableWatchlistItemProps {
  item: WatchlistItem
  selectedItems: Set<string>
  onItemSelect: (id: string) => void
  onSymbolClick: (symbol: string) => void
}

const SortableWatchlistItem: React.FC<SortableWatchlistItemProps> = ({
  item,
  selectedItems,
  onItemSelect,
  onSymbolClick,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-4 py-4 transition-colors ${
        selectedItems.has(item.id)
          ? 'bg-blue-50 dark:bg-blue-900'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      <div className='flex items-center space-x-3'>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className='flex-shrink-0 touch-target p-1 cursor-grab active:cursor-grabbing'
          style={{ touchAction: 'none' }}
        >
          <svg className='w-5 h-5 text-gray-400' fill='currentColor' viewBox='0 0 20 20'>
            <path d='M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z' />
          </svg>
        </div>

        {/* Selection Checkbox */}
        <button
          onClick={() => onItemSelect(item.id)}
          className='flex-shrink-0 touch-target flex items-center justify-center'
        >
          <div
            className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
              selectedItems.has(item.id)
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {selectedItems.has(item.id) && (
              <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  clipRule='evenodd'
                />
              </svg>
            )}
          </div>
        </button>

        {/* Symbol Info */}
        <div className='flex-1 min-w-0 cursor-pointer' onClick={() => onSymbolClick(item.symbol)}>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center space-x-2'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white'>{item.symbol}</h3>
                <svg
                  className='w-4 h-4 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                  />
                </svg>
              </div>
              <p className='text-sm text-gray-500 dark:text-gray-400 truncate'>{item.name}</p>
            </div>

            {/* Price Info */}
            <div className='text-right'>
              <div className='text-lg font-bold text-gray-900 dark:text-white'>
                ${item.price.toFixed(2)}
              </div>
              <div
                className={`text-sm font-medium ${
                  item.change >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {item.change >= 0 ? '+' : ''}
                {item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Additional Details - Mobile */}
          <div className='mt-3 grid grid-cols-3 gap-4 text-xs'>
            <div>
              <span className='text-gray-500 dark:text-gray-400'>Volume</span>
              <div className='font-medium text-gray-900 dark:text-white'>{item.volume}</div>
            </div>
            <div>
              <span className='text-gray-500 dark:text-gray-400'>Market Cap</span>
              <div className='font-medium text-gray-900 dark:text-white'>{item.marketCap}</div>
            </div>
            <div>
              <span className='text-gray-500 dark:text-gray-400'>Added</span>
              <div className='font-medium text-gray-900 dark:text-white'>
                {item.addedAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const WatchlistPage: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [watchlistItems, setWatchlistItems] = useState<
    Array<{ symbol: string; name: string; addedAt: string }>
  >([])

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ユーザーのウォッチリストを取得
  const fetchWatchlist = async () => {
    try {
      const response = await apiService.get('/watchlist')
      if (response.success && response.data?.watchlist) {
        setWatchlistItems(response.data.watchlist)
      } else {
        console.error('Failed to fetch watchlist')
        setError('ウォッチリストの取得に失敗しました')
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      setError('ウォッチリストの取得に失敗しました')
    }
  }

  // ウォッチリストから複数のシンボルを削除
  const deleteWatchlistItems = async (symbols: string[]) => {
    try {
      console.log('削除開始:', symbols)

      // 各シンボルを並列で削除
      const deletePromises = symbols.map(symbol => {
        console.log(`削除リクエスト送信: ${symbol}`)
        return apiService.delete(`/watchlist/${symbol}`)
      })

      const results = await Promise.allSettled(deletePromises)

      // 結果をログ出力
      results.forEach((result, index) => {
        const symbol = symbols[index]
        if (result.status === 'fulfilled') {
          console.log(`削除成功: ${symbol}`, result.value)
        } else {
          console.error(`削除失敗: ${symbol}`, result.reason)
        }
      })

      // 成功した削除をカウント
      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length

      console.log(`削除結果: ${successCount}/${symbols.length} 成功`)

      if (successCount > 0) {
        // ウォッチリストを再取得して表示を更新
        await fetchWatchlist()
        console.log(`Deleted ${successCount} symbols from watchlist`)
      }

      if (successCount < symbols.length) {
        setError(`一部のシンボルの削除に失敗しました (${successCount}/${symbols.length})`)
      }
    } catch (error) {
      console.error('Error deleting from watchlist:', error)
      setError('ウォッチリストからの削除に失敗しました')
    }
  }

  // 株価データを取得する関数
  const fetchQuoteData = async (symbol: string): Promise<QuoteData | null> => {
    try {
      const response = await apiService.get(`/market/quote/${symbol}`)
      if (response.success && response.data) {
        return response.data
      }
      return null
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error)
      return null
    }
  }

  // ウォッチリストの位置を更新
  const updateWatchlistPositions = async (items: Array<{ symbol: string; position: number }>) => {
    try {
      const response = await apiService.put('/watchlist/positions', { items })
      if (!response.success) {
        console.error('Failed to update watchlist positions')
        setError('ウォッチリストの順番更新に失敗しました')
      }
    } catch (error) {
      console.error('Error updating watchlist positions:', error)
      setError('ウォッチリストの順番更新に失敗しました')
    }
  }

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = watchlist.findIndex(item => item.id === active.id)
    const newIndex = watchlist.findIndex(item => item.id === over.id)

    const newWatchlist = arrayMove(watchlist, oldIndex, newIndex)
    setWatchlist(newWatchlist)

    // 位置を更新するための配列を作成
    const positionUpdates = newWatchlist.map((item, index) => ({
      symbol: item.symbol,
      position: index,
    }))

    // サーバーに位置を送信
    await updateWatchlistPositions(positionUpdates)
  }

  // 複数のシンボルの株価データを取得
  const fetchMultipleQuotes = async (symbols: Array<{ symbol: string; name: string }>) => {
    const promises = symbols.map(async (stock, index) => {
      const quoteData = await fetchQuoteData(stock.symbol)

      // API からデータが取得できない場合のフォールバック
      const fallbackData: QuoteData = {
        symbol: stock.symbol,
        currentPrice: Math.random() * 500 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        high: Math.random() * 500 + 100,
        low: Math.random() * 400 + 50,
        open: Math.random() * 450 + 75,
        previousClose: Math.random() * 450 + 75,
        volume: Math.floor(Math.random() * 100000000),
        marketCap: Math.random() * 3000000000000,
        timestamp: Date.now(),
      }

      const data = quoteData || fallbackData

      return {
        id: `watchlist-${index + 1}`,
        symbol: stock.symbol,
        name: stock.name,
        price: data.currentPrice,
        change: data.change,
        changePercent: data.changePercent,
        volume: formatVolume(data.volume),
        marketCap: formatMarketCap(data.marketCap),
        addedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000), // 各銘柄を 1 日ずつずらして追加
      }
    })

    return Promise.all(promises)
  }

  // ボリュームをフォーマット
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(1)}B`
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`
    return volume.toString()
  }

  // 時価総額をフォーマット
  const formatMarketCap = (marketCap?: number): string => {
    if (!marketCap) return 'N/A'
    if (marketCap >= 1000000000000) return `${(marketCap / 1000000000000).toFixed(2)}T`
    if (marketCap >= 1000000000) return `${(marketCap / 1000000000).toFixed(2)}B`
    if (marketCap >= 1000000) return `${(marketCap / 1000000).toFixed(2)}M`
    return marketCap.toString()
  }

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setIsLoading(true)

        // ウォッチリストを取得
        await fetchWatchlist()
      } catch (err) {
        setError('Failed to load watchlist')
        console.error('Watchlist loading error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadWatchlist()
  }, [])

  // watchlistItems が変更されたら株価データを取得
  useEffect(() => {
    const loadQuotes = async () => {
      if (watchlistItems.length > 0) {
        try {
          const watchlistData = await fetchMultipleQuotes(watchlistItems)
          setWatchlist(watchlistData)
        } catch (err) {
          console.error('Error loading quotes:', err)
        }
      } else {
        // ウォッチリストが空の場合は UI も空にする
        setWatchlist([])
      }
    }

    loadQuotes()

    // 30 秒ごとにデータを更新
    const interval = setInterval(loadQuotes, 30000)
    return () => clearInterval(interval)
  }, [watchlistItems])

  const handleItemSelect = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === watchlist.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(watchlist.map(item => item.id)))
    }
  }

  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    // 選択されたアイテムのシンボルを取得
    const selectedSymbols = watchlist
      .filter(item => selectedItems.has(item.id))
      .map(item => item.symbol)

    if (selectedSymbols.length === 0) {
      setShowDeleteConfirm(false)
      return
    }

    // データベースから削除
    await deleteWatchlistItems(selectedSymbols)

    // UI の状態をリセット
    setSelectedItems(new Set())
    setShowDeleteConfirm(false)
  }

  const handleSymbolClick = (symbol: string) => {
    // Navigate to charts with selected symbol
    window.location.href = `/charts?symbol=${symbol}`
  }

  if (isLoading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Loading watchlist...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='h-full flex items-center justify-center px-4'>
        <div className='text-center max-w-sm mx-auto'>
          <div className='bg-red-100 dark:bg-red-900 rounded-full p-4 mx-auto w-16 h-16 mb-4'>
            <svg
              className='w-8 h-8 mx-auto text-red-600 dark:text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
            Error Loading Watchlist
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{error}</p>
        </div>
      </div>
    )
  }

  if (watchlist.length === 0) {
    return (
      <div className='h-full flex items-center justify-center px-4'>
        <div className='text-center max-w-sm mx-auto'>
          <div className='bg-gray-100 dark:bg-gray-800 rounded-full p-6 mx-auto w-20 h-20 mb-6'>
            <svg
              className='w-8 h-8 mx-auto text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
            Your Watchlist is Empty
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400 mb-6'>
            Add symbols to track their performance and get real-time updates.
          </p>
          <Button
            variant='primary'
            onClick={() => (window.location.href = '/search')}
            className='w-full sm:w-auto'
          >
            <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
            Search Symbols
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Watchlist</h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          {watchlist.length} symbol{watchlist.length !== 1 ? 's' : ''} in your watchlist
        </p>
      </div>

      <div className='h-full flex flex-col'>
        {/* Actions Bar */}
        <div className='flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4'>
          <div className='flex items-center justify-between'>
            {/* Left side - Selection controls */}
            <div className='flex items-center space-x-4'>
              {watchlist.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className='flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                >
                  <div
                    className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      selectedItems.size === watchlist.length
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {selectedItems.size === watchlist.length && (
                      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    )}
                  </div>
                  <span>
                    {selectedItems.size === watchlist.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
              )}
              {selectedItems.size > 0 && (
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  {selectedItems.size} selected
                </span>
              )}
            </div>

            {/* Right side - Action Buttons */}
            <div className='flex items-center space-x-2'>
              {selectedItems.size > 0 && (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setSelectedItems(new Set())}
                    className='hidden sm:flex'
                  >
                    Cancel
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleDeleteSelected}
                    className='text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900'
                  >
                    <svg
                      className='w-4 h-4 sm:mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                      />
                    </svg>
                    <span className='hidden sm:inline'>Delete ({selectedItems.size})</span>
                  </Button>
                </>
              )}
              <Button
                variant='primary'
                size='sm'
                onClick={() => (window.location.href = '/search')}
              >
                <svg
                  className='w-4 h-4 sm:mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                <span className='hidden sm:inline'>Add Symbol</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Watchlist Content */}
        <div className='flex-1 overflow-hidden'>
          <div className='h-full overflow-y-auto mobile-scroll'>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={watchlist} strategy={verticalListSortingStrategy}>
                <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {watchlist.map(item => (
                    <SortableWatchlistItem
                      key={item.id}
                      item={item}
                      selectedItems={selectedItems}
                      onItemSelect={handleItemSelect}
                      onSymbolClick={handleSymbolClick}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                Delete Selected Items
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-6'>
                Are you sure you want to remove {selectedItems.size} item
                {selectedItems.size !== 1 ? 's' : ''} from your watchlist? This action cannot be
                undone.
              </p>
              <div className='flex space-x-4'>
                <Button
                  variant='outline'
                  onClick={() => setShowDeleteConfirm(false)}
                  className='flex-1'
                >
                  Cancel
                </Button>
                <Button
                  variant='primary'
                  onClick={confirmDelete}
                  className='flex-1 bg-red-600 hover:bg-red-700 border-red-600'
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WatchlistPage
