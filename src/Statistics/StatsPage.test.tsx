import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { StatsPage } from './StatsPage'
import { AuthProvider } from '../Common/Auth/AuthContext'

// Mock the Statistics components
vi.mock('./UserStats', () => ({
  UserStats: () => <div data-testid="user-stats">User Stats Component</div>
}))

vi.mock('./GameHistory', () => ({
  GameHistory: () => <div data-testid="game-history">Game History Component</div>
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

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the stats page with title and description', () => {
    renderWithProviders(<StatsPage />)
    
    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument()
    expect(screen.getByText('Track your progress and view your game history')).toBeInTheDocument()
  })

  it('renders tabs for Overview and Game History', () => {
    renderWithProviders(<StatsPage />)
    
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /game history/i })).toBeInTheDocument()
  })

  it('shows UserStats component by default (Overview tab)', () => {
    renderWithProviders(<StatsPage />)
    
    expect(screen.getByTestId('user-stats')).toBeInTheDocument()
    expect(screen.queryByTestId('game-history')).not.toBeInTheDocument()
  })

  it('switches to Game History tab when clicked', async () => {
    renderWithProviders(<StatsPage />)
    
    const gameHistoryTab = screen.getByRole('tab', { name: /game history/i })
    fireEvent.click(gameHistoryTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('game-history')).toBeInTheDocument()
      expect(screen.queryByTestId('user-stats')).not.toBeInTheDocument()
    })
  })

  it('switches back to Overview tab when clicked', async () => {
    renderWithProviders(<StatsPage />)
    
    // First switch to Game History
    const gameHistoryTab = screen.getByRole('tab', { name: /game history/i })
    fireEvent.click(gameHistoryTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('game-history')).toBeInTheDocument()
    })
    
    // Then switch back to Overview
    const overviewTab = screen.getByRole('tab', { name: /overview/i })
    fireEvent.click(overviewTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('user-stats')).toBeInTheDocument()
      expect(screen.queryByTestId('game-history')).not.toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes for tabs', () => {
    renderWithProviders(<StatsPage />)
    
    const overviewTab = screen.getByRole('tab', { name: /overview/i })
    const gameHistoryTab = screen.getByRole('tab', { name: /game history/i })
    
    expect(overviewTab).toHaveAttribute('aria-controls', 'stats-tabpanel-0')
    expect(gameHistoryTab).toHaveAttribute('aria-controls', 'stats-tabpanel-1')
    
    expect(overviewTab).toHaveAttribute('id', 'stats-tab-0')
    expect(gameHistoryTab).toHaveAttribute('id', 'stats-tab-1')
  })

  it('has proper tabpanel attributes', () => {
    renderWithProviders(<StatsPage />)
    
    const overviewPanel = screen.getByRole('tabpanel', { name: /overview/i })
    
    expect(overviewPanel).toHaveAttribute('id', 'stats-tabpanel-0')
    expect(overviewPanel).toHaveAttribute('aria-labelledby', 'stats-tab-0')
  })
})