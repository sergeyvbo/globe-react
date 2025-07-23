import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { LeaderboardPage } from './LeaderboardPage'
import { AuthProvider } from '../Common/Auth/AuthContext'

// Mock the Leaderboard component
vi.mock('./Leaderboard', () => ({
  Leaderboard: () => <div data-testid="leaderboard">Leaderboard Component</div>
}))

const theme = createTheme()

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the leaderboard page with title and description', () => {
    renderWithProviders(<LeaderboardPage />)
    
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument()
    expect(screen.getByText('See how you rank against other players')).toBeInTheDocument()
  })

  it('renders the Leaderboard component', () => {
    renderWithProviders(<LeaderboardPage />)
    
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument()
  })

  it('uses proper container layout', () => {
    renderWithProviders(<LeaderboardPage />)
    
    const container = screen.getByRole('heading', { name: 'Leaderboard' }).closest('.MuiContainer-root')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass('MuiContainer-maxWidthLg')
  })

  it('has proper heading hierarchy', () => {
    renderWithProviders(<LeaderboardPage />)
    
    const heading = screen.getByRole('heading', { name: 'Leaderboard' })
    expect(heading.tagName).toBe('H1')
  })
})