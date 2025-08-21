import React, { useState, useEffect } from 'react'
import { Button } from '@trading-viewer/ui'
import {
  Order,
  OrderType,
  OrderSide,
  TradingSimulation,
  TradingQuote,
  Position,
  validateOrder,
} from '@trading-viewer/shared'

interface OrderFormProps {
  simulation: TradingSimulation
  quotes: Record<string, TradingQuote>
  positions: Position[]
  onCreateOrder: (orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void
  className?: string
}

/**
 * Order Form Component
 * - Create various order types
 * - Real-time validation
 * - Position-aware order suggestions
 */
export const OrderForm: React.FC<OrderFormProps> = ({
  simulation,
  quotes,
  positions,
  onCreateOrder,
  className = '',
}) => {
  const [symbol, setSymbol] = useState('')
  const [side, setSide] = useState<OrderSide>('buy')
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [quantity, setQuantity] = useState<number>(100)
  const [price, setPrice] = useState<number>(0)
  const [stopPrice, setStopPrice] = useState<number>(0)
  const [limitPrice, setLimitPrice] = useState<number>(0)
  const [trailAmount, setTrailAmount] = useState<number>(0.05)
  const [timeInForce, setTimeInForce] = useState<'day' | 'gtc'>('day')
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const currentQuote = symbol ? quotes[symbol] : null
  const currentPosition = symbol ? positions.find(p => p.symbol === symbol) : null

  // Update price when symbol or quote changes
  useEffect(() => {
    if (currentQuote) {
      const marketPrice = side === 'buy' ? currentQuote.ask : currentQuote.bid
      setPrice(marketPrice)
      setStopPrice(marketPrice)
      setLimitPrice(marketPrice)
    }
  }, [currentQuote, side])

  // Validate order data
  useEffect(() => {
    const orderData = {
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      type: orderType,
      timeInForce,
      ...(orderType === 'limit' && { price }),
      ...(orderType === 'stop' && { stopPrice }),
      ...(orderType === 'stop_limit' && { stopPrice, limitPrice }),
      ...(orderType === 'trailing_stop' && { trailAmount }),
    }

    const validation = validateOrder(orderData)
    setErrors(validation.errors.map(e => e.message))
    setWarnings(validation.warnings.map(w => w.message))
  }, [symbol, side, quantity, orderType, price, stopPrice, limitPrice, trailAmount, timeInForce])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (errors.length > 0) return

    const orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      type: orderType,
      timeInForce,
      simulationId: simulation.id,
    }

    // Add type-specific fields
    switch (orderType) {
      case 'limit':
        orderData.price = price
        break
      case 'stop':
        orderData.stopPrice = stopPrice
        break
      case 'stop_limit':
        orderData.stopPrice = stopPrice
        orderData.limitPrice = limitPrice
        break
      case 'trailing_stop':
        orderData.trailAmount = trailAmount
        break
    }

    onCreateOrder(orderData)

    // Reset form
    setQuantity(100)
    setErrors([])
    setWarnings([])
  }

  const calculateOrderValue = () => {
    if (!currentQuote || !quantity) return 0

    const orderPrice =
      orderType === 'market'
        ? side === 'buy'
          ? currentQuote.ask
          : currentQuote.bid
        : orderType === 'limit'
          ? price
          : currentQuote.last

    return quantity * orderPrice
  }

  const getMaxQuantity = () => {
    if (!currentQuote || side === 'sell') return 10000 // Arbitrary max for sell orders

    const orderPrice = orderType === 'market' ? currentQuote.ask : price || currentQuote.ask

    const commission =
      simulation.settings.commissionPerTrade +
      orderPrice * quantity * simulation.settings.commissionPercentage

    return Math.floor((simulation.portfolio.currentBalance - commission) / orderPrice)
  }

  const orderTypes: { value: OrderType; label: string; description: string }[] = [
    {
      value: 'market',
      label: 'Market',
      description: 'Execute immediately at current market price',
    },
    { value: 'limit', label: 'Limit', description: 'Execute only at specified price or better' },
    {
      value: 'stop',
      label: 'Stop',
      description: 'Trigger market order when price reaches stop level',
    },
    {
      value: 'stop_limit',
      label: 'Stop Limit',
      description: 'Trigger limit order when price reaches stop level',
    },
    {
      value: 'trailing_stop',
      label: 'Trailing Stop',
      description: 'Stop order that trails the market price',
    },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Symbol Input */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label
              htmlFor='symbol-input'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Symbol
            </label>
            <input
              id='symbol-input'
              type='text'
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder='AAPL'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 uppercase'
              required
            />
            {currentQuote && (
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                Last: ${currentQuote.last.toFixed(2)} • Bid: ${currentQuote.bid.toFixed(2)} • Ask: $
                {currentQuote.ask.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <div
              id='order-side-label'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Side
            </div>
            <div
              className='flex rounded-md shadow-sm'
              role='group'
              aria-labelledby='order-side-label'
            >
              <button
                type='button'
                onClick={() => setSide('buy')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-md border transition-colors ${
                  side === 'buy'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                BUY
              </button>
              <button
                type='button'
                onClick={() => setSide('sell')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-r-md border border-l-0 transition-colors ${
                  side === 'sell'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                SELL
              </button>
            </div>
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label
            htmlFor='order-type-select'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
          >
            Order Type
          </label>
          <select
            id='order-type-select'
            value={orderType}
            onChange={e => setOrderType(e.target.value as OrderType)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
          >
            {orderTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {orderTypes.find(t => t.value === orderType)?.description}
          </p>
        </div>

        {/* Quantity */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label
              htmlFor='quantity-input'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Quantity
            </label>
            <input
              id='quantity-input'
              type='number'
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              min='1'
              max={getMaxQuantity()}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
              required
            />
            {side === 'buy' && (
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                Max: {getMaxQuantity().toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='time-in-force-select'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Time in Force
            </label>
            <select
              id='time-in-force-select'
              value={timeInForce}
              onChange={e => setTimeInForce(e.target.value as 'day' | 'gtc')}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
            >
              <option value='day'>Day</option>
              <option value='gtc'>Good Till Cancelled</option>
            </select>
          </div>
        </div>

        {/* Price Fields based on Order Type */}
        {orderType === 'limit' && (
          <div>
            <label
              htmlFor='limit-price-input'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Limit Price
            </label>
            <div className='relative'>
              <span className='absolute left-3 top-2 text-gray-500'>$</span>
              <input
                id='limit-price-input'
                type='number'
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                step='0.01'
                min='0.01'
                className='w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
                required
              />
            </div>
          </div>
        )}

        {orderType === 'stop' && (
          <div>
            <label
              htmlFor='stop-price-input'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Stop Price
            </label>
            <div className='relative'>
              <span className='absolute left-3 top-2 text-gray-500'>$</span>
              <input
                id='stop-price-input'
                type='number'
                value={stopPrice}
                onChange={e => setStopPrice(Number(e.target.value))}
                step='0.01'
                min='0.01'
                className='w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
                required
              />
            </div>
          </div>
        )}

        {orderType === 'stop_limit' && (
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='stop-limit-stop-price-input'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                Stop Price
              </label>
              <div className='relative'>
                <span className='absolute left-3 top-2 text-gray-500'>$</span>
                <input
                  id='stop-limit-stop-price-input'
                  type='number'
                  value={stopPrice}
                  onChange={e => setStopPrice(Number(e.target.value))}
                  step='0.01'
                  min='0.01'
                  className='w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor='stop-limit-limit-price-input'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                Limit Price
              </label>
              <div className='relative'>
                <span className='absolute left-3 top-2 text-gray-500'>$</span>
                <input
                  id='stop-limit-limit-price-input'
                  type='number'
                  value={limitPrice}
                  onChange={e => setLimitPrice(Number(e.target.value))}
                  step='0.01'
                  min='0.01'
                  className='w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
                  required
                />
              </div>
            </div>
          </div>
        )}

        {orderType === 'trailing_stop' && (
          <div>
            <label
              htmlFor='trail-amount-input'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Trail Amount ($)
            </label>
            <div className='relative'>
              <span className='absolute left-3 top-2 text-gray-500'>$</span>
              <input
                id='trail-amount-input'
                type='number'
                value={trailAmount}
                onChange={e => setTrailAmount(Number(e.target.value))}
                step='0.01'
                min='0.01'
                className='w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
                required
              />
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className='bg-gray-50 dark:bg-gray-700 p-3 rounded-md'>
          <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>Order Summary</h4>
          <div className='space-y-1 text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Order Value:</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                ${calculateOrderValue().toLocaleString()}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>Commission:</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                ${simulation.settings.commissionPerTrade.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between font-medium'>
              <span className='text-gray-900 dark:text-white'>Total:</span>
              <span className='text-gray-900 dark:text-white'>
                ${(calculateOrderValue() + simulation.settings.commissionPerTrade).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Current Position Info */}
        {currentPosition && (
          <div className='bg-blue-50 dark:bg-blue-900 p-3 rounded-md'>
            <h4 className='text-sm font-medium text-blue-900 dark:text-blue-100 mb-2'>
              Current Position
            </h4>
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between'>
                <span className='text-blue-700 dark:text-blue-300'>Position:</span>
                <span
                  className={`font-medium ${currentPosition.side === 'long' ? 'text-green-600' : 'text-red-600'}`}
                >
                  {currentPosition.quantity > 0 ? '+' : ''}
                  {currentPosition.quantity} shares ({currentPosition.side})
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-blue-700 dark:text-blue-300'>Avg Price:</span>
                <span className='font-medium text-blue-900 dark:text-blue-100'>
                  ${currentPosition.averagePrice.toFixed(2)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-blue-700 dark:text-blue-300'>Unrealized P&L:</span>
                <span
                  className={`font-medium ${currentPosition.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  ${currentPosition.unrealizedPnL.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Messages */}
        {errors.length > 0 && (
          <div className='bg-red-50 dark:bg-red-900 p-3 rounded-md'>
            <h4 className='text-sm font-medium text-red-900 dark:text-red-100 mb-2'>Errors:</h4>
            <ul className='text-sm text-red-700 dark:text-red-300 space-y-1'>
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className='bg-yellow-50 dark:bg-yellow-900 p-3 rounded-md'>
            <h4 className='text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2'>
              Warnings:
            </h4>
            <ul className='text-sm text-yellow-700 dark:text-yellow-300 space-y-1'>
              {warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type='submit'
          variant='primary'
          disabled={errors.length > 0 || !symbol || quantity <= 0}
          className={`w-full ${
            side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {quantity} {symbol} ({orderType})
        </Button>
      </form>
    </div>
  )
}

export default OrderForm
