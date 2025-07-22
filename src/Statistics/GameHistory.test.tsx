import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GameHistory } from './GameHistory'
import { useAuth } from '../Common/Auth'
import { gameStatsApiService } from '../Common/GameProgress/GameStatsApiService'
import { GameHistoryResponse, GameSessionDto, AuthErrorType } from '../Common/types'

// Mock the auth hook
vi.mock('../Common/Auth', () => ({
  useAuth: vi.fn()
}))

// Mock the game stats API service
vi.mock('../Common/GameProgress/GameStatsApiService', () => ({
  gameStatsApiService: {
    getUserGameHistory: vi.fn()
  },
  GameStatsApiError: class GameStatsApiError extends Error {
    constructor(public type: string, message: string) {
      super(message)
      this.name = 'GameStatsApiError'
    }
  }
}))

const mockUseAuth = useAuth as ReturnType<typeof vi.mocked<typeof useAuth>>
const mockGameStatsApiService = gameStatsApiService as ReturnType<typeof vi.mocked<typeof gameStatsApiService>>

const mockGameSessions: GameSessionDto[] = [
  {
    id: '1',
    gameType: 'countries',
    correctAnswers: 8,
    wrongAnswers: 2,
    accuracy: 80,
    sessionStartTime: '2024-01-15T10:30:00Z',
    sessionEndTime: '2024-01-15T10:35:00Z',
    sessionDurationMs: 300000, // 5 minutes
    createdAt: '2024-01-15T10:35:00Z'
  },
  {
    id: '2',
    gameType: 'flags',
    correctAnswers: 6,
    wrongAnswers: 4,
    accuracy: 60,
    sessionStartTime: '2024-01-14T15:20:00Z',
    sessionEndTime: '2024-01-14T15:23:00Z',
    sessionDurationMs: 180000, // 3 minutes
    createdAt: '2024-01-14T15:23:00Z'
  },
  {
    id: '3',
    gameType: 'states',
    correctAnswers: 9,
    wrongAnswers: 1,
    accuracy: 90,
    sessionStartTime: '2024-01-13T09:15:00Z',
    sessionEndTime: '2024-01-13T09:18:00Z',
    sessionDurationMs: 180000, // 3 minutes
    createdAt: '2024-01-13T09:18:00Z'
  }
]

const mockGameHistory: GameHistoryResponse = {
  sessions: mockGameSessions,
  totalCount: 3,
  page: 1,
  pageSize: 10,
  hasNextPage: false
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  provider: 'email' as const,
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-15')
}

describe('GameHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows authentication required message when user is not authenticated', () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    render(<GameHistory />)

    expect(screen.getByText('Authentication Required')).toBeInTheDocument()
    expect(screen.getByText('Please log in to view your game history.')).toBeInTheDocument()
  })

  it('shows loading state while fetching game history', () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    // Make the API call hang to test loading state
    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockImplementation(() => new Promise(() => {}))

    render(<GameHistory />)

    expect(screen.getByText('Loading Game History...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays game history when data is loaded successfully', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockResolvedValue(mockGameHistory)

    render(<GameHistory />)

    await waitFor(() => {
      expect(screen.getByText('Game History')).toBeInTheDocument()
    })

    // Check table headers
    expect(screen.getAllByText('Game Type')).toHaveLength(3) // Table header, filter label, and legend
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('Date & Time')).toBeInTheDocument()

    // Check game type names
    expect(screen.getByText('Countries')).toBeInTheDocument()
    expect(screen.getByText('Flags')).toBeInTheDocument()
    expect(screen.getByText('States')).toBeInTheDocument()

    // Check scores
    expect(screen.getByText('8')).toBeInTheDocument() // Countries correct
    expect(screen.getByText('6')).toBeInTheDocument() // Flags correct
    expect(screen.getByText('9')).toBeInTheDocument() // States correct

    // Check accuracy percentages
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()

    // Check durations
    expect(screen.getByText('5m 0s')).toBeInTheDocument()
    expect(screen.getAllByText('3m 0s')).toHaveLength(2)
  })

  it('shows no data message when user has no game history', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const emptyHistory: GameHistoryResponse = {
      sessions: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      hasNextPage: false
    }

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockResolvedValue(emptyHistory)

    render(<GameHistory />)

    await waitFor(() => {
      expect(screen.getByText('No Game History Yet')).toBeInTheDocument()
    })

    expect(screen.getByText('Start playing quizzes to see your game history here!')).toBeInTheDocument()
  })

  it('filters game history by game type', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockResolvedValue(mockGameHistory)

    render(<GameHistory />)

    await waitFor(() => {
      expect(screen.getByText('Game History')).toBeInTheDocument()
    })

    // Initially should show all games
    expect(screen.getByText('Countries')).toBeInTheDocument()
    expect(screen.getByText('Flags')).toBeInTheDocument()
    expect(screen.getByText('States')).toBeInTheDocument()

    // Filter by countries
    const gameTypeSelect = screen.getByRole('combobox')
    fireEvent.mouseDown(gameTypeSelect)
    fireEvent.click(screen.getByRole('option', { name: 'Countries' }))

    await waitFor(() => {
      // After filtering, only countries games should be visible
      // Check that the select shows "Countries" as selected
      expect(screen.getByDisplayValue('countries')).toBeInTheDocument()
      // The table should only show countries data (8 correct answers from countries game)
      expect(screen.getByText('8')).toBeInTheDocument()
      // Flags and States data should not be visible (6 and 9 correct answers)
      expect(screen.queryByText('6')).not.toBeInTheDocument()
      expect(screen.queryByText('9')).not.toBeInTheDocument()
    })
  })

  it('shows error message when API call fails', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    // Import the actual GameStatsApiError class from the mock
    const { GameStatsApiError } = await import('../Common/GameProgress/GameStatsApiService')
    const error = new GameStatsApiError(AuthErrorType.NETWORK_ERROR, 'Network error')

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockRejectedValue(error)

    render(<GameHistory />)

    await waitFor(() => {
      expect(screen.getByText('Unable to connect to the server. Please check your internet connection and try again.')).toBeInTheDocument()
    })
  })

  it('shows token expired error message', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    // Import the actual GameStatsApiError class from the mock
    const { GameStatsApiError } = await import('../Common/GameProgress/GameStatsApiService')
    const error = new GameStatsApiError(AuthErrorType.TOKEN_EXPIRED, 'Token expired')

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockRejectedValue(error)

    render(<GameHistory />)

    await waitFor(() => {
      expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument()
    })
  })

  it('handles refresh button click', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockResolvedValue(mockGameHistory)

    render(<GameHistory />)

    await waitFor(() => {
      expect(screen.getByText('Game History')).toBeInTheDocument()
    })

    // Click refresh button
    const refreshButton = screen.getByLabelText('Refresh')
    fireEvent.click(refreshButton)

    // Should call the API again
    expect(mockGameStatsApiService.getUserGameHistory).toHaveBeenCalledTimes(2)
  })

  it('applies custom className when provided', () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const { container } = render(<GameHistory className="custom-history" />)
    
    expect(container.firstChild).toHaveClass('custom-history')
  })

  it('uses custom page size when provided', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockResolvedValue(mockGameHistory)

    render(<GameHistory pageSize={5} />)

    await waitFor(() => {
      expect(mockGameStatsApiService.getUserGameHistory).toHaveBeenCalledWith(1, 5)
    })
  })

  it('formats duration correctly for different time ranges', async () => {
    vi.mocked(mockUseAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn()
    })

    const historyWithVariedDurations: GameHistoryResponse = {
      sessions: [
        {
          ...mockGameSessions[0],
          sessionDurationMs: 45000 // 45 seconds
        },
        {
          ...mockGameSessions[1],
          sessionDurationMs: 125000 // 2 minutes 5 seconds
        }
      ],
      totalCount: 2,
      page: 1,
      pageSize: 10,
      hasNextPage: false
    }

    vi.mocked(mockGameStatsApiService.getUserGameHistory).mockResolvedValue(historyWithVariedDurations)

    render(<GameHistory />)

    await waitFor(() => {
      expect(screen.getByText('45s')).toBeInTheDocument()
      expect(screen.getByText('2m 5s')).toBeInTheDocument()
    })
  })
})