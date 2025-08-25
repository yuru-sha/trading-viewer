import React, { useState } from 'react'
import { Button } from '@trading-viewer/ui'
import { Order, Position, TradingSimulation, TradingQuote } from '@trading-viewer/shared'
import OrderForm from './OrderForm'
import PositionsTable from './PositionsTable'
import OrdersTable from './OrdersTable'
import PortfolioSummary from './PortfolioSummary'

interface PerformanceMetrics {
  [key: string]: unknown
}

interface TradingPanelProps {
  simulation: TradingSimulation | null
  orders: Order[]
  positions: Position[]
  quotes: Record<string, TradingQuote>
  portfolioValue: number
  unrealizedPnL: number
  performanceMetrics: PerformanceMetrics
  onCreateOrder: (orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void
  onCancelOrder: (orderId: string) => void
  onExecuteOrder: (orderId: string, price: number) => void
  onCreateSimulation: (name: string, balance: number) => void
  onResetSimulation: (id: string) => void
  className?: string
}

type TabType = 'trade' | 'positions' | 'orders' | 'portfolio' | 'settings'

/**
 * Trading Panel Component
 * - Order creation and management
 * - Position monitoring
 * - Portfolio tracking
 * - Simulation controls
 */
export const TradingPanel: React.FC<TradingPanelProps> = ({
  simulation,
  orders,
  positions,
  quotes,
  portfolioValue,
  unrealizedPnL,
  performanceMetrics,
  onCreateOrder,
  onCancelOrder,
  onExecuteOrder,
  onCreateSimulation,
  onResetSimulation,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('trade')
  const [showCreateSimModal, setShowCreateSimModal] = useState(false)
  const [newSimName, setNewSimName] = useState('')
  const [newSimBalance, setNewSimBalance] = useState(100000)

  const tabs = [
    { id: 'trade' as TabType, label: 'Trade', icon: '📈' },
    { id: 'positions' as TabType, label: 'Positions', icon: '💼', badge: positions.length },
    {
      id: 'orders' as TabType,
      label: 'Orders',
      icon: '📋',
      badge: orders.filter(o => o.status === 'pending').length,
    },
    { id: 'portfolio' as TabType, label: 'Portfolio', icon: '📊' },
    { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' },
  ]

  const handleCreateSimulation = () => {
    if (newSimName.trim() && newSimBalance > 0) {
      onCreateSimulation(newSimName.trim(), newSimBalance)
      setShowCreateSimModal(false)
      setNewSimName('')
      setNewSimBalance(100000)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100)
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}
    >
      {/* Header */}
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
              Trading Simulator
            </h2>
            {simulation && (
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {simulation.name} •{' '}
                {simulation.status === 'running'
                  ? '🟢 Active'
                  : simulation.status === 'completed'
                    ? '✅ Completed'
                    : '⏸️ Failed'}
              </p>
            )}
          </div>

          <div className='flex items-center space-x-2'>
            {!simulation ? (
              <Button
                variant='primary'
                size='sm'
                onClick={() => setShowCreateSimModal(true)}
                disabled={false}
                className=''
              >
                Create Simulation
              </Button>
            ) : (
              <div className='flex items-center space-x-2'>
                <div className='text-right'>
                  <div className='text-lg font-semibold text-gray-900 dark:text-white'>
                    {formatCurrency(portfolioValue)}
                  </div>
                  <div
                    className={`text-sm ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {unrealizedPnL >= 0 ? '+' : ''}
                    {formatCurrency(unrealizedPnL)}
                  </div>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onResetSimulation(simulation.id)}
                  disabled={false}
                  className=''
                >
                  Reset
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className='flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!simulation && tab.id !== 'settings'}
              className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : !simulation && tab.id !== 'settings'
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className='p-4'>
        {!simulation && activeTab !== 'settings' ? (
          <div className='text-center py-12'>
            <div className='space-y-4'>
              <div className='text-6xl'>📊</div>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                No Active Simulation
              </h3>
              <p className='text-gray-600 dark:text-gray-400 max-w-md mx-auto'>
                Create a trading simulation to start practicing your trading strategies with virtual
                money.
              </p>
              <Button
                variant='primary'
                onClick={() => setShowCreateSimModal(true)}
                disabled={false}
                className=''
              >
                Create Your First Simulation
              </Button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'trade' && simulation && (
              <OrderForm
                simulation={simulation}
                quotes={quotes}
                onCreateOrder={onCreateOrder}
                positions={positions}
              />
            )}

            {activeTab === 'positions' && simulation && (
              <PositionsTable
                positions={positions}
                quotes={quotes}
                onClosePosition={(symbol: string) => {
                  // Create a market order to close the position
                  const position = positions.find(p => p.symbol === symbol)
                  if (position) {
                    onCreateOrder({
                      userId: 'current-user', // TODO: Get from context
                      symbol,
                      side: position.side === 'long' ? 'sell' : 'buy',
                      quantity: Math.abs(position.quantity),
                      type: 'market',
                      timeInForce: 'DAY',
                      filledQuantity: 0,
                      remainingQuantity: Math.abs(position.quantity),
                      simulationId: simulation.id,
                    })
                  }
                }}
              />
            )}

            {activeTab === 'orders' && simulation && (
              <OrdersTable
                orders={orders}
                quotes={quotes}
                onCancelOrder={onCancelOrder}
                onExecuteOrder={onExecuteOrder}
              />
            )}

            {activeTab === 'portfolio' && simulation && (
              <PortfolioSummary
                simulation={simulation}
                performanceMetrics={performanceMetrics}
                positions={positions}
                quotes={quotes}
              />
            )}

            {activeTab === 'settings' && (
              <div className='space-y-6'>
                <div>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                    Simulation Settings
                  </h3>

                  {simulation ? (
                    <div className='space-y-4'>
                      <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                          <span className='text-gray-600 dark:text-gray-400'>Name:</span>
                          <span className='ml-2 font-medium text-gray-900 dark:text-white'>
                            {simulation.name}
                          </span>
                        </div>
                        <div>
                          <span className='text-gray-600 dark:text-gray-400'>Status:</span>
                          <span className='ml-2 font-medium text-gray-900 dark:text-white'>
                            {simulation.status}
                          </span>
                        </div>
                        <div>
                          <span className='text-gray-600 dark:text-gray-400'>Initial Balance:</span>
                          <span className='ml-2 font-medium text-gray-900 dark:text-white'>
                            {formatCurrency(simulation.config.startingBalance)}
                          </span>
                        </div>
                        <div>
                          <span className='text-gray-600 dark:text-gray-400'>Commission:</span>
                          <span className='ml-2 font-medium text-gray-900 dark:text-white'>
                            {formatPercent(simulation.config.commission)}
                          </span>
                        </div>
                      </div>

                      <div className='pt-4 border-t border-gray-200 dark:border-gray-600'>
                        <Button
                          variant='outline'
                          onClick={() => onResetSimulation(simulation.id)}
                          disabled={false}
                          className='w-full'
                        >
                          Reset Simulation
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className='text-center py-8'>
                      <p className='text-gray-600 dark:text-gray-400 mb-4'>
                        No simulation active. Create one to get started.
                      </p>
                      <Button
                        variant='primary'
                        onClick={() => setShowCreateSimModal(true)}
                        disabled={false}
                        className=''
                      >
                        Create Simulation
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Simulation Modal */}
      {showCreateSimModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Create Trading Simulation
            </h3>

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='simulation-name-input'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                >
                  Simulation Name
                </label>
                <input
                  id='simulation-name-input'
                  type='text'
                  value={newSimName}
                  onChange={e => setNewSimName(e.target.value)}
                  placeholder='My Trading Simulation'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
                />
              </div>

              <div>
                <label
                  htmlFor='starting-balance-input'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                >
                  Starting Balance
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-2 text-gray-500'>$</span>
                  <input
                    id='starting-balance-input'
                    type='number'
                    value={newSimBalance}
                    onChange={e => setNewSimBalance(Number(e.target.value))}
                    min='1000'
                    max='10000000'
                    step='1000'
                    className='w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
                  />
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  Virtual money for practice trading
                </p>
              </div>
            </div>

            <div className='flex justify-end space-x-3 mt-6'>
              <Button
                variant='ghost'
                disabled={false}
                className=''
                onClick={() => {
                  setShowCreateSimModal(false)
                  setNewSimName('')
                  setNewSimBalance(100000)
                }}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                disabled={!newSimName.trim() || newSimBalance < 1000}
                className=''
                onClick={handleCreateSimulation}
              >
                Create Simulation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TradingPanel
