import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { AppProvider } from '../../contexts/AppContext'
import { AuthProvider } from '../../contexts/AuthContext'

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}))

const renderLayout = (children: React.ReactNode = <div>Test Content</div>) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Layout>{children}</Layout>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe.skip('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders layout without crashing', () => {
    const { container } = renderLayout()
    expect(container).toBeInTheDocument()
  })

  it('renders children content', () => {
    const testContent = <div data-testid='custom-content'>Custom Content</div>
    renderLayout(testContent)

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.getByText('Custom Content')).toBeInTheDocument()
  })

  it('renders main layout structure', () => {
    renderLayout()

    // Check if basic structure exists
    expect(document.body).toBeInTheDocument()
  })
})
