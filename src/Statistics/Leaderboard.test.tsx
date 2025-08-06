import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Leaderboard } from './Leaderboard'
import { useAuth } from '../Common/Auth'
import { leaderboardService } from '../Common/GameProgress/LeaderboardService'
import { LeaderboardResponse, ApiErrorDetails } from '../Common/types'

// Mock the auth hook
vi.mock('../Common/Auth', () => ({
  useAuth: vi.fn()
}))

// Mock the leaderboard service
vi.mock('../Common/GameProgress/LeaderboardService', () => ({
  leaderboardService: {
    getGlobalLeaderboard: vi.fn(),
    getLeaderboardByGameType: vi.fn(),
    getLeaderboardByPeriod: vi.fn(),
    getFilteredLeaderboard: vi.fn()
  },
  LeaderboardApiError: class LeaderboardApiError extends Error {
    public type: string
    public details?: ApiErrorDetails

    constructor({ type, message, details }: { type: string; message: string; details?: ApiErrorDetails }) {
      super(message)
      this.name = 'LeaderboardApiError'
      this.type = type
      this.details = details
    }
  }
}))

const mockUseAuth = vi.mocked(useAuth)
const mockLeaderboardService = vi.mocked(leaderboardService)

const mockLeaderboardData: LeaderboardResponse = {
  players: [
    {
      rank: 1,
      userId: 'user1',
      userName: 'Player One',
      userAvatar: undefined,
      totalScore: 1500,
      accuracy: 95.5,
      gamesPlayed: 25,
      isCurrentUser: false
    },
    {
      rank: 2,
      userId: 'user2',
      userName: 'Player Two',
      userAvatar: undefined,
      totalScore: 1200,
      accuracy: 88.2,
      gamesPlayed: 20,
      isCurrentUser: true
    },
    {
      rank: 3,
      userId: 'user3',
      userName: 'Player Three',
      userAvatar: undefined,
      totalScore: 1000,
      accuracy: 82.1,
      gamesPlayed: 18,
      isCurrentUser: false
    }
  ],
  totalPlayers: 100,
  page: 1,
  pageSize: 20,
  hasNextPage: true,
  currentUserRank: 2
}

describe('Leaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user2', email: 'test@example.com', name: 'Test User' } as any,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    mockLeaderboardService.getGlobalLeaderboard.mockImplementation(
      () => new Promise(() => { }) // Never resolves to keep loading state
    )

    render(<Leaderboard />)

    expect(screen.getByText('Loading Leaderboard...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders leaderboard data correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user2', email: 'test@example.com', name: 'Test User' } as any,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    mockLeaderboardService.getGlobalLeaderboard.mockResolvedValue(mockLeaderboardData)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    })

    // Check if players are rendered
    expect(screen.getByText('Player One')).toBeInTheDocument()
    expect(screen.getByText('Player Two')).toBeInTheDocument()
    expect(screen.getByText('Player Three')).toBeInTheDocument()

    // Check if current user is highlighted
    expect(screen.getByText('You')).toBeInTheDocument()

    // Check if current user rank is displayed
    expect(screen.getByText(/Your current rank: #2 out of 100 players/)).toBeInTheDocument()

    // Check scores and accuracy (the numbers are formatted with spaces as thousands separators)
    expect(screen.getByText('1 500')).toBeInTheDocument()
    expect(screen.getByText('96%')).toBeInTheDocument() // Rounded accuracy
    expect(screen.getByText('88%')).toBeInTheDocument()
  })

  it('handles filter changes correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user2', email: 'test@example.com', name: 'Test User' } as any,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    mockLeaderboardService.getGlobalLeaderboard.mockResolvedValue(mockLeaderboardData)
    mockLeaderboardService.getLeaderboardByGameType.mockResolvedValue(mockLeaderboardData)

    const user = userEvent.setup()
    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    })

    // Change game type filter - get the first combobox (Game Type)
    const comboboxes = screen.getAllByRole('combobox')
    const gameTypeSelect = comboboxes[0] // First combobox is Game Type
    await user.click(gameTypeSelect)
    await user.click(screen.getByText('Countries'))

    await waitFor(() => {
      expect(mockLeaderboardService.getLeaderboardByGameType).toHaveBeenCalledWith('countries', 1, 20)
    })
  })

  it('shows no data message when leaderboard is empty', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const emptyLeaderboard: LeaderboardResponse = {
      players: [],
      totalPlayers: 0,
      page: 1,
      pageSize: 20,
      hasNextPage: false
    }

    mockLeaderboardService.getGlobalLeaderboard.mockResolvedValue(emptyLeaderboard)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('No Players Found')).toBeInTheDocument()
    })

    expect(screen.getByText('No players have completed any games yet.')).toBeInTheDocument()
  })

  it('handles errors correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    mockLeaderboardService.getGlobalLeaderboard.mockRejectedValue(new Error('Network error'))

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
    })
  })

  it('handles RFC 9457 network errors correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const { LeaderboardApiError } = await import('../Common/GameProgress/LeaderboardService')
    const networkError = new LeaderboardApiError({
      type: 'NETWORK_ERROR' as any,
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      details: {
        type: 'about:blank',
        title: 'Network Error',
        status: 0,
        detail: 'Network error occurred. Please check your connection.'
      }
    })

    mockLeaderboardService.getGlobalLeaderboard.mockRejectedValue(networkError)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument()
    })
  })

  it('handles RFC 9457 token expired errors correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', name: 'Test User' } as any,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const { LeaderboardApiError } = await import('../Common/GameProgress/LeaderboardService')
    const tokenExpiredError = new LeaderboardApiError({
      type: 'TOKEN_EXPIRED' as any,
      message: 'Your session has expired. Please log in again to view personalized leaderboard data.',
      details: {
        type: 'http://localhost:5000/problems/authentication-error',
        title: 'Authentication Error',
        status: 401,
        detail: 'The access token has expired'
      }
    })

    mockLeaderboardService.getGlobalLeaderboard.mockRejectedValue(tokenExpiredError)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText(/Your session has expired/)).toBeInTheDocument()
    })
  })

  it('handles RFC 9457 validation errors correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const { LeaderboardApiError } = await import('../Common/GameProgress/LeaderboardService')
    const validationError = new LeaderboardApiError({
      type: 'VALIDATION_ERROR' as any,
      message: 'Invalid request parameters. Please try refreshing the page.',
      details: {
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Invalid request parameters'
      }
    })

    mockLeaderboardService.getGlobalLeaderboard.mockRejectedValue(validationError)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText(/Invalid request parameters/)).toBeInTheDocument()
    })
  })

  it('handles RFC 9457 errors with custom messages correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const { LeaderboardApiError } = await import('../Common/GameProgress/LeaderboardService')
    const customError = new LeaderboardApiError({
      type: 'UNKNOWN_ERROR' as any,
      message: 'Custom RFC 9457 error message from server',
      details: {
        type: 'http://localhost:5000/problems/custom-error',
        title: 'Custom Error',
        status: 500,
        detail: 'Custom RFC 9457 error message from server'
      }
    })

    mockLeaderboardService.getGlobalLeaderboard.mockRejectedValue(customError)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('Custom RFC 9457 error message from server')).toBeInTheDocument()
    })
  })

  it('displays correct rank icons for top 3 players', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    mockLeaderboardService.getGlobalLeaderboard.mockResolvedValue(mockLeaderboardData)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    })

    // Check that trophy icons are rendered for top 3 (we can't easily test the specific colors in jsdom)
    // Note: There's also a trophy icon in the header, so we expect 4 total (3 for players + 1 for header)
    const trophyIcons = screen.getAllByTestId('EmojiEventsIcon')
    expect(trophyIcons.length).toBeGreaterThanOrEqual(3) // At least 3 for the players
  })

  it('shows pagination when there are more players', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const largeLeaderboard: LeaderboardResponse = {
      ...mockLeaderboardData,
      totalPlayers: 100 // More than pageSize (20)
    }

    mockLeaderboardService.getGlobalLeaderboard.mockResolvedValue(largeLeaderboard)

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    })

    // Check pagination is rendered
    expect(screen.getByText('Showing 1 to 20 of 100 players')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument() // Pagination component
  })
})