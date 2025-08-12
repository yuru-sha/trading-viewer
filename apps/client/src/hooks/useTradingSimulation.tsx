import { useReducer, useCallback, useRef } from 'react'
import {
  TradingSimulation,
  TradingState,
  TradingAction,
  Order,
  OrderExecution,
  Position,
  Portfolio,
  TradingQuote,
  OrderExecutionResult,
  validateOrder,
  ORDER_TEMPLATES,
} from '@shared'

const initialState: TradingState = {
  simulations: {},
  activeSimulationId: null,
  orders: [],
  executions: [],
  positions: [],
  quotes: {},
  isConnected: false,
  isSimulationMode: true,
}

const tradingReducer = (state: TradingState, action: TradingAction): TradingState => {
  switch (action.type) {
    case 'CREATE_ORDER':
      const newOrderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newOrder: Order = {
        ...action.payload,
        id: newOrderId,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        simulationId: state.activeSimulationId || undefined,
      } as Order

      return {
        ...state,
        orders: [...state.orders, newOrder],
      }

    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id
            ? { ...order, ...action.payload.updates, updatedAt: Date.now() }
            : order
        ),
      }

    case 'CANCEL_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload
            ? { ...order, status: 'cancelled' as const, updatedAt: Date.now() }
            : order
        ),
      }

    case 'EXECUTE_ORDER':
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const execution: OrderExecution = {
        ...action.payload.execution,
        id: executionId,
        simulationId: state.activeSimulationId || undefined,
      }

      return {
        ...state,
        executions: [...state.executions, execution],
        orders: state.orders.map(order =>
          order.id === action.payload.orderId
            ? { ...order, status: 'filled' as const, updatedAt: Date.now() }
            : order
        ),
      }

    case 'UPDATE_POSITION':
      return {
        ...state,
        positions: state.positions.map(position =>
          position.symbol === action.payload.symbol
            ? { ...position, ...action.payload.updates, updatedAt: Date.now() }
            : position
        ),
      }

    case 'CLOSE_POSITION':
      return {
        ...state,
        positions: state.positions.filter(position => position.id !== action.payload),
      }

    case 'LOAD_SIMULATION':
      return {
        ...state,
        simulations: {
          ...state.simulations,
          [action.payload.id]: action.payload,
        },
        activeSimulationId: action.payload.id,
        orders: action.payload.portfolio.orders,
        executions: action.payload.portfolio.executions,
        positions: action.payload.portfolio.positions,
      }

    case 'START_SIMULATION':
      return {
        ...state,
        simulations: {
          ...state.simulations,
          [action.payload]: {
            ...state.simulations[action.payload],
            status: 'active',
            updatedAt: Date.now(),
          },
        },
      }

    case 'PAUSE_SIMULATION':
      return {
        ...state,
        simulations: {
          ...state.simulations,
          [action.payload]: {
            ...state.simulations[action.payload],
            status: 'paused',
            updatedAt: Date.now(),
          },
        },
      }

    case 'RESET_SIMULATION':
      const simulation = state.simulations[action.payload]
      if (!simulation) return state

      const resetSimulation: TradingSimulation = {
        ...simulation,
        portfolio: {
          ...simulation.portfolio,
          currentBalance: simulation.portfolio.initialBalance,
          totalPnL: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          positions: [],
          orders: [],
          executions: [],
        },
        status: 'active',
        startDate: Date.now(),
        updatedAt: Date.now(),
      }

      return {
        ...state,
        simulations: {
          ...state.simulations,
          [action.payload]: resetSimulation,
        },
        orders: state.activeSimulationId === action.payload ? [] : state.orders,
        executions: state.activeSimulationId === action.payload ? [] : state.executions,
        positions: state.activeSimulationId === action.payload ? [] : state.positions,
      }

    default:
      return state
  }
}

/**
 * Trading Simulation Management Hook
 * - Manage multiple trading simulations
 * - Handle order creation, execution, and management
 * - Portfolio tracking and P&L calculation
 * - Risk management and validation
 */
export const useTradingSimulation = () => {
  const [state, dispatch] = useReducer(tradingReducer, initialState)
  const nextSimulationId = useRef(1)

  // Create a new simulation
  const createSimulation = useCallback((name: string, initialBalance = 100000) => {
    const simulationId = `sim_${Date.now()}_${nextSimulationId.current++}`

    const newSimulation: TradingSimulation = {
      id: simulationId,
      name,
      description: `Trading simulation with $${initialBalance.toLocaleString()} starting balance`,
      portfolio: {
        id: `portfolio_${simulationId}`,
        name: `${name} Portfolio`,
        initialBalance,
        currentBalance: initialBalance,
        totalPnL: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
        positions: [],
        orders: [],
        executions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      settings: {
        initialBalance,
        commissionPerTrade: 0.99,
        commissionPercentage: 0.0005, // 0.05%
        slippagePercentage: 0.001, // 0.1%
        allowShortSelling: true,
        allowMarginTrading: false,
        marginRequirement: 0.5,
        maxPositionsPerSymbol: 1,
        riskLimits: {
          maxPositionSize: initialBalance * 0.2, // 20% of portfolio
          maxDailyLoss: initialBalance * 0.05, // 5% daily loss limit
          maxTotalLoss: initialBalance * 0.25, // 25% total loss limit
        },
        dataSource: 'live',
        simulationSpeed: 1,
      },
      status: 'active',
      startDate: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    dispatch({ type: 'LOAD_SIMULATION', payload: newSimulation })
    return newSimulation
  }, [])

  // Create an order
  const createOrder = useCallback(
    (orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
      const validation = validateOrder(orderData)
      if (!validation.isValid) {
        throw new Error(`Invalid order: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      dispatch({ type: 'CREATE_ORDER', payload: orderData })
      return validation
    },
    []
  )

  // Update an order
  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    dispatch({ type: 'UPDATE_ORDER', payload: { id: orderId, updates } })
  }, [])

  // Cancel an order
  const cancelOrder = useCallback((orderId: string) => {
    dispatch({ type: 'CANCEL_ORDER', payload: orderId })
  }, [])

  // Simulate order execution (would be replaced with real execution logic)
  const executeOrder = useCallback(
    (orderId: string, executionPrice: number): OrderExecutionResult => {
      const order = state.orders.find(o => o.id === orderId)
      if (!order || order.status !== 'pending') {
        return {
          success: false,
          orderId,
          message: 'Order not found or not pending',
          remainingQuantity: 0,
          executedQuantity: 0,
        }
      }

      const currentSim = state.activeSimulationId
        ? state.simulations[state.activeSimulationId]
        : null
      if (!currentSim) {
        return {
          success: false,
          orderId,
          message: 'No active simulation',
          remainingQuantity: order.quantity,
          executedQuantity: 0,
        }
      }

      // Calculate commission and fees
      const commission =
        currentSim.settings.commissionPerTrade +
        executionPrice * order.quantity * currentSim.settings.commissionPercentage

      // Apply slippage
      const slippage = executionPrice * currentSim.settings.slippagePercentage
      const adjustedPrice =
        order.side === 'buy' ? executionPrice + slippage : executionPrice - slippage

      const totalCost = adjustedPrice * order.quantity + commission

      // Check if we have enough buying power
      if (order.side === 'buy' && totalCost > currentSim.portfolio.currentBalance) {
        return {
          success: false,
          orderId,
          message: 'Insufficient buying power',
          remainingQuantity: order.quantity,
          executedQuantity: 0,
        }
      }

      // Execute the order
      const execution: Omit<OrderExecution, 'id'> = {
        orderId,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: adjustedPrice,
        timestamp: Date.now(),
        commission,
        fees: 0,
        simulationId: state.activeSimulationId || undefined,
      }

      dispatch({ type: 'EXECUTE_ORDER', payload: { orderId, execution } })

      // Update portfolio balance
      const newBalance =
        order.side === 'buy'
          ? currentSim.portfolio.currentBalance - totalCost
          : currentSim.portfolio.currentBalance + adjustedPrice * order.quantity - commission

      dispatch({
        type: 'UPDATE_PORTFOLIO',
        payload: {
          currentBalance: newBalance,
          updatedAt: Date.now(),
        },
      })

      // Update or create position
      const existingPosition = state.positions.find(p => p.symbol === order.symbol)
      if (existingPosition) {
        const newQuantity =
          order.side === 'buy'
            ? existingPosition.quantity + order.quantity
            : existingPosition.quantity - order.quantity

        if (newQuantity === 0) {
          // Position closed
          const realizedPnL =
            (adjustedPrice - existingPosition.averagePrice) *
            order.quantity *
            (order.side === 'sell' ? 1 : -1)

          dispatch({ type: 'CLOSE_POSITION', payload: existingPosition.id })

          // Update portfolio with realized P&L
          dispatch({
            type: 'UPDATE_PORTFOLIO',
            payload: {
              realizedPnL: currentSim.portfolio.realizedPnL + realizedPnL,
              totalPnL: currentSim.portfolio.totalPnL + realizedPnL,
            },
          })
        } else {
          // Update position
          const newAveragePrice =
            (existingPosition.averagePrice * existingPosition.quantity +
              adjustedPrice * order.quantity * (order.side === 'buy' ? 1 : -1)) /
            newQuantity

          dispatch({
            type: 'UPDATE_POSITION',
            payload: {
              symbol: order.symbol,
              updates: {
                quantity: newQuantity,
                averagePrice: newAveragePrice,
                side: newQuantity > 0 ? 'long' : 'short',
                updatedAt: Date.now(),
              },
            },
          })
        }
      } else if (order.quantity > 0) {
        // Create new position
        const newPosition: Position = {
          id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: order.symbol,
          quantity: order.side === 'buy' ? order.quantity : -order.quantity,
          averagePrice: adjustedPrice,
          marketValue: adjustedPrice * order.quantity,
          unrealizedPnL: 0,
          realizedPnL: 0,
          side: order.side === 'buy' ? 'long' : 'short',
          openedAt: Date.now(),
          updatedAt: Date.now(),
          simulationId: state.activeSimulationId || undefined,
        }

        dispatch({
          type: 'UPDATE_POSITION',
          payload: { symbol: order.symbol, updates: newPosition },
        })
      }

      return {
        success: true,
        orderId,
        executionId: execution.timestamp.toString(),
        message: 'Order executed successfully',
        remainingQuantity: 0,
        executedQuantity: order.quantity,
        executedPrice: adjustedPrice,
      }
    },
    [state.orders, state.activeSimulationId, state.simulations, state.positions]
  )

  // Get current portfolio value
  const getPortfolioValue = useCallback(() => {
    const currentSim = state.activeSimulationId ? state.simulations[state.activeSimulationId] : null
    if (!currentSim) return 0

    const cashValue = currentSim.portfolio.currentBalance
    const positionsValue = state.positions.reduce((total, position) => {
      const quote = state.quotes[position.symbol]
      if (!quote) return total

      const marketValue = Math.abs(position.quantity) * quote.last
      return total + marketValue
    }, 0)

    return cashValue + positionsValue
  }, [state.activeSimulationId, state.simulations, state.positions, state.quotes])

  // Calculate unrealized P&L
  const calculateUnrealizedPnL = useCallback(() => {
    return state.positions.reduce((total, position) => {
      const quote = state.quotes[position.symbol]
      if (!quote) return total

      const currentValue = position.quantity * quote.last
      const costBasis = Math.abs(position.quantity) * position.averagePrice
      const unrealizedPnL = currentValue - (position.side === 'long' ? costBasis : -costBasis)

      return total + unrealizedPnL
    }, 0)
  }, [state.positions, state.quotes])

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const currentSim = state.activeSimulationId ? state.simulations[state.activeSimulationId] : null
    if (!currentSim) return null

    const portfolioValue = getPortfolioValue()
    const totalReturn = portfolioValue - currentSim.portfolio.initialBalance
    const totalReturnPercent = (totalReturn / currentSim.portfolio.initialBalance) * 100
    const unrealizedPnL = calculateUnrealizedPnL()

    const totalTrades = state.executions.filter(e => e.simulationId === currentSim.id).length
    const positions = state.positions.filter(p => p.simulationId === currentSim.id)

    const winningTrades = state.executions.filter(e => {
      // This is a simplified calculation - in reality, you'd need to track completed trades
      return e.simulationId === currentSim.id && e.side === 'sell'
    }).length

    return {
      portfolioValue,
      totalReturn,
      totalReturnPercent,
      unrealizedPnL,
      realizedPnL: currentSim.portfolio.realizedPnL,
      totalTrades,
      winningTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      activePositions: positions.length,
      cashBalance: currentSim.portfolio.currentBalance,
    }
  }, [
    state.activeSimulationId,
    state.simulations,
    state.executions,
    state.positions,
    getPortfolioValue,
    calculateUnrealizedPnL,
  ])

  // Update market quotes (would be connected to real data feed)
  const updateQuotes = useCallback(
    (quotes: Record<string, TradingQuote>) => {
      // This would be called by a market data feed
      // For now, we'll just store the quotes and recalculate P&L
      Object.assign(state.quotes, quotes)

      // Update unrealized P&L for all positions
      state.positions.forEach(position => {
        const quote = quotes[position.symbol]
        if (quote) {
          const currentValue = position.quantity * quote.last
          const costBasis = Math.abs(position.quantity) * position.averagePrice
          const unrealizedPnL = currentValue - (position.side === 'long' ? costBasis : -costBasis)

          dispatch({
            type: 'UPDATE_POSITION',
            payload: {
              symbol: position.symbol,
              updates: {
                marketValue: Math.abs(position.quantity) * quote.last,
                unrealizedPnL,
              },
            },
          })
        }
      })
    },
    [state.quotes, state.positions]
  )

  // Load a simulation
  const loadSimulation = useCallback((simulation: TradingSimulation) => {
    dispatch({ type: 'LOAD_SIMULATION', payload: simulation })
  }, [])

  // Start simulation
  const startSimulation = useCallback((simulationId: string) => {
    dispatch({ type: 'START_SIMULATION', payload: simulationId })
  }, [])

  // Pause simulation
  const pauseSimulation = useCallback((simulationId: string) => {
    dispatch({ type: 'PAUSE_SIMULATION', payload: simulationId })
  }, [])

  // Reset simulation
  const resetSimulation = useCallback((simulationId: string) => {
    dispatch({ type: 'RESET_SIMULATION', payload: simulationId })
  }, [])

  // Create order from template
  const createOrderFromTemplate = useCallback(
    (
      type: keyof typeof ORDER_TEMPLATES,
      symbol: string,
      side: 'buy' | 'sell',
      quantity: number,
      additionalParams: any = {}
    ) => {
      const template = ORDER_TEMPLATES[type]
      const orderData = {
        ...template,
        symbol,
        side,
        quantity,
        ...additionalParams,
      }

      return createOrder(orderData as Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'>)
    },
    [createOrder]
  )

  return {
    // State
    simulations: state.simulations,
    activeSimulationId: state.activeSimulationId,
    activeSimulation: state.activeSimulationId ? state.simulations[state.activeSimulationId] : null,
    orders: state.orders,
    executions: state.executions,
    positions: state.positions,
    quotes: state.quotes,
    isSimulationMode: state.isSimulationMode,
    isConnected: state.isConnected,

    // Actions
    createSimulation,
    loadSimulation,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    createOrder,
    createOrderFromTemplate,
    updateOrder,
    cancelOrder,
    executeOrder,
    updateQuotes,

    // Computed
    portfolioValue: getPortfolioValue(),
    unrealizedPnL: calculateUnrealizedPnL(),
    performanceMetrics: getPerformanceMetrics(),

    // Utilities
    getOrderById: (id: string) => state.orders.find(o => o.id === id),
    getPositionBySymbol: (symbol: string) => state.positions.find(p => p.symbol === symbol),
    getOrdersBySymbol: (symbol: string) => state.orders.filter(o => o.symbol === symbol),
    getExecutionsBySymbol: (symbol: string) => state.executions.filter(e => e.symbol === symbol),

    // Filters
    pendingOrders: state.orders.filter(o => o.status === 'pending'),
    filledOrders: state.orders.filter(o => o.status === 'filled'),
    cancelledOrders: state.orders.filter(o => o.status === 'cancelled'),
    openPositions: state.positions.filter(p => p.quantity !== 0),
    longPositions: state.positions.filter(p => p.side === 'long'),
    shortPositions: state.positions.filter(p => p.side === 'short'),
  }
}

export default useTradingSimulation
