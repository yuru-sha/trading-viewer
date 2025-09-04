import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { bootstrap } from './bootstrap'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 3,
    },
  },
})

// Initialize application before rendering
bootstrap()
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </React.StrictMode>
    )
  })
  .catch(error => {
    console.error('Failed to bootstrap application:', error)
    // Render error state
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem',
          fontFamily: 'system-ui',
        }}
      >
        <h1>Failed to initialize application</h1>
        <p>Please refresh the page and try again.</p>
        <details>
          <summary>Error details</summary>
          <pre style={{ fontSize: '0.8rem', color: '#666' }}>{error.message || String(error)}</pre>
        </details>
      </div>
    )
  })
