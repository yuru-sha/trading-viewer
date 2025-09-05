import React from 'react'
import { Navigate } from 'react-router-dom'

const HomePage: React.FC = () => {
  return <Navigate to='/watchlist' replace />
}

export default HomePage
