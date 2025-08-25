import jwt from 'jsonwebtoken'

// Test helper for generating valid JWT tokens
export const generateTestToken = (payload: { userId: string; role?: string }) => {
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role || 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
    process.env.JWT_SECRET || 'test-secret'
  )
}

export const generateExpiredTestToken = (payload: { userId: string; role?: string }) => {
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role || 'user',
      iat: Math.floor(Date.now() / 1000) - 60 * 60 * 2, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 60 * 60, // 1 hour ago (expired)
    },
    process.env.JWT_SECRET || 'test-secret'
  )
}
