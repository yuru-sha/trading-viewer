export type User = {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system'
  defaultTimeframe: string
  defaultSymbol: string
  language: string
}
