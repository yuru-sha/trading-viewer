export interface WebSocketPort {
  connect(url: string): Promise<void>
  disconnect(): Promise<void>
  subscribe(channel: string, callback: (data: unknown) => void): () => void
  send(message: unknown): Promise<void>
  onConnectionStateChange(callback: (connected: boolean) => void): () => void
}
