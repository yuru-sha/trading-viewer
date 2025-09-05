import React from 'react'
import { Order, TradingQuote } from '@trading-viewer/shared'

interface OrdersTableProps {
  orders: Order[]
  quotes: Record<string, TradingQuote>
  onCancelOrder: (orderId: string) => void
  onExecuteOrder: (orderId: string, price: number) => void
}

const OrdersTable: React.FC<OrdersTableProps> = () => {
  return <div>Orders Table</div>
}

export default OrdersTable
