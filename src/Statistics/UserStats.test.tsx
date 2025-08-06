import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserStats } from './UserStats'
import { useAuth } from '../Common/Auth'
import { gameStatsApiService } from '../Common/GameProgress/GameStatsApiService'
import { GameStatsResponse, AuthErrorType } from '../Common/types'

// Mock the auth hook
vi.mock('../Common/Auth', () => ({
  useAuth: vi.fn()
}))

// Mock the game stats API service
vi.mock('../Common/GameProgress/GameStatsApiService', () => ({
  gameStatsApiService: {
    getUserStats: vi.fn()
  },
  GameStatsApiError: class GameStatsApiError extends Error {
    constructor(public type: AuthErrorType, message: string) {
      super(message)
      this.name = 'GameStatsApiError'
    }
  }
}))

const mockUseAuth = useAuth as ReturnType<typeof vi.mocked<typeof useAuth>>
const mockGameStatsApiService = gameStatsApiService as ReturnType<typeof vi.mocked<typeof gameStatsApiService>>

const mockGameStats: GameStatsResponse = {
  totalGames: 25,
  totalCorrectAnswers: 180,
  totalWrongAnswers: 45,
  bestStreak: 12,
  averageAccuracy: 80,
  lastPlayedAt: '2024-01-15T10:30:00Z',
  gameTypeStats: {
    countries: {
      games: 10,
      correctAnswers: 75,
      wrongAnswers: 15,
      accuracy: 83.3,
      bestStreak: 8
    },
    flags: {
      games: 8,
      correctAnswers: 60,
      wrongAnswers: 20,
      accuracy: 75,
      bestStreak: 6
    },
    states: {
      games: 7,
      correctAnswers: 45,
      wrongAnswers: 10,
      accuracy: 81.8,
      bestStreak: 12
    }
  }
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  provider: 'email' as const,
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-15')
}

describe('UserStats Component', () => {
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

    render(<UserStats />)

    expect(screen.getByText('Authentication Required')).toBeInTheDocument()
    expect(screen.getByText('Please log in to view your game statistics.')).toBeInTheDocument()
  })

  it('shows loading state while fetching statistics', () => {
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
    vi.mocked(mockGameStatsApiService.getUserStats).mockImplementation(() => new Promise(() => {}))

    render(<UserStats />)

    expect(screen.getByText('Loading Statistics...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays user statistics when data is loaded successfully', async () => {
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

    vi.mocked(mockGameStatsApiService.getUserStats).mockResolvedValue(mockGameStats)

    render(<UserStats />)

    await waitFor(() => {
      expect(screen.getByText('Your Game Statistics')).toBeInTheDocument()
    })

    // Check overall statistics
    expect(screen.getByText('25')).toBeInTheDocument() // Total Games
    expect(screen.getByText('80%')).toBeInTheDocument() // Average Accuracy
    expect(screen.getAllByText('12')).toHaveLength(2) // Best Streak (appears in overall and states)
    expect(screen.getByText('180')).toBeInTheDocument() // Correct Answers
    expect(screen.getByText('45')).toBeInTheDocument() // Wrong Answers

    // Check game type statistics
    expect(screen.getByText('Countries Quiz')).toBeInTheDocument()
    expect(screen.getByText('Flags Quiz')).toBeInTheDocument()
    expect(screen.getByText('States Quiz')).toBeInTheDocument()

    // Check game counts
    expect(screen.getByText('10 games')).toBeInTheDocument() // Countries
    expect(screen.getByText('8 games')).toBeInTheDocument() // Flags
    expect(screen.getByText('7 games')).toBeInTheDocument() // States
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

    const emptyStats: GameStatsResponse = {
      totalGames: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      bestStreak: 0,
      averageAccuracy: 0,
      gameTypeStats: {
        countries: { games: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0, bestStreak: 0 },
        flags: { games: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0, bestStreak: 0 },
        states: { games: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0, bestStreak: 0 }
      }
    }

    vi.mocked(mockGameStatsApiService.getUserStats).mockResolvedValue(emptyStats)

    render(<UserStats />)

    await waitFor(() => {
      expect(screen.getByText('No Game History Yet')).toBeInTheDocument()
    })

    expect(screen.getByText('Start playing quizzes to see your statistics here!')).toBeInTheDocument()
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

    vi.mocked(mockGameStatsApiService.getUserStats).mockRejectedValue(error)

    render(<UserStats />)

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

    vi.mocked(mockGameStatsApiService.getUserStats).mockRejectedValue(error)

    render(<UserStats />)

    await waitFor(() => {
      expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument()
    })
  })

  it('shows RFC 9457 error message for validation errors', async () => {
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
    const rfc9457Message = 'The request contains invalid data'
    const error = new GameStatsApiError(AuthErrorType.VALIDATION_ERROR, rfc9457Message)

    vi.mocked(mockGameStatsApiService.getUserStats).mockRejectedValue(error)

    render(<UserStats />)

    await waitFor(() => {
      expect(screen.getByText(rfc9457Message)).toBeInTheDocument()
    })
  })

  it('shows RFC 9457 error message for unknown error types', async () => {
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
    const rfc9457Message = 'A specific error occurred on the server'
    const error = new GameStatsApiError('UNKNOWN_ERROR' as AuthErrorType, rfc9457Message)

    vi.mocked(mockGameStatsApiService.getUserStats).mockRejectedValue(error)

    render(<UserStats />)

    await waitFor(() => {
      expect(screen.getByText(rfc9457Message)).toBeInTheDocument()
    })
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

    const { container } = render(<UserStats className="custom-stats" />)
    
    expect(container.firstChild).toHaveClass('custom-stats')
  })

  it('handles missing lastPlayedAt gracefully', async () => {
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

    const statsWithoutLastPlayed: GameStatsResponse = {
      ...mockGameStats,
      lastPlayedAt: undefined
    }

    vi.mocked(mockGameStatsApiService.getUserStats).mockResolvedValue(statsWithoutLastPlayed)

    render(<UserStats />)

    await waitFor(() => {
      expect(screen.getByText('Never')).toBeInTheDocument()
    })
  })
})