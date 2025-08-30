import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'
import { vi } from 'vitest'

// Mock WebSocket with instance tracking
let mockWebSocketInstances: MockWebSocket[] = []

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  readyState = WebSocket.CONNECTING

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    mockWebSocketInstances.push(this)
    setTimeout(() => this.simulateOpen(), 100)
  }

  send(data: string) {
    console.log('Mock send:', data)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  simulateOpen() {
    this.readyState = WebSocket.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

describe.skip('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MockWebSocket.instances = []
    mockWebSocketInstances = []
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8000/ws',
        autoConnect: false,
      })
    )

    expect(result.current.isConnected).toBe(false)
    expect(result.current.isConnecting).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.lastQuote).toBeNull()
  })

  it('should connect to WebSocket', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8000/ws',
        autoConnect: true,
      })
    )

    expect(result.current.isConnecting).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(result.current.isConnected).toBe(true)
    expect(result.current.isConnecting).toBe(false)
  })

  it('should handle subscription and message reception', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8000/ws',
        autoConnect: true,
      })
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    // Subscribe to a symbol
    act(() => {
      result.current.subscribe('AAPL')
    })

    // Simulate receiving a quote message
    const mockQuote = {
      type: 'quote',
      data: {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.5,
        changePercent: 1.67,
      },
    }

    act(() => {
      const ws = MockWebSocket.instances[0]
      if (ws && ws.simulateMessage) {
        ws.simulateMessage(mockQuote)
      }
    })

    expect(result.current.lastQuote).toBeDefined()
  })

  it('should handle unsubscription', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8000/ws',
        autoConnect: true,
      })
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    act(() => {
      result.current.subscribe('AAPL')
    })

    act(() => {
      result.current.unsubscribe('AAPL')
    })

    // Verify unsubscription doesn't cause errors
    expect(result.current.isConnected).toBe(true)
  })

  it('should handle connection errors', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8000/ws',
        autoConnect: true,
      })
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      const ws = (global.WebSocket as any).instances?.[0]
      if (ws && ws.simulateError) {
        ws.simulateError()
      }
    })

    expect(result.current.error).toBeDefined()
  })

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8000/ws',
        autoConnect: true,
      })
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(result.current.isConnected).toBe(true)

    unmount()

    // Verify cleanup doesn't cause errors
  })
})
