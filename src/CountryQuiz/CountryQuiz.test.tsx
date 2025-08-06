import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CountryQuiz } from './CountryQuiz'
import { useAuth } from '../Common/Auth/AuthContext'
import { useOfflineDetector } from '../Common/Network/useOfflineDetector'
import { gameProgressService } from '../Common/GameProgress/GameProgressService'

// Mock dependencies
vi.mock('../Common/Auth/AuthContext')
vi.mock('../Common/Network/useOfflineDetector')
vi.mock('../Common/GameProgress/GameProgressService')
vi.mock('../Common/utils', () => ({
  getSettings: () => ({
    difficulty: 'medium',
    language: 'en',
    showPin: true,
    showZoomButtons: true,
    showBorders: true
  }),
  randomElement: (arr: unknown[]) => arr[0],
  shuffleArray: (arr: unknown[]) => arr
}))

// Mock geo data
vi.mock('../Common/GeoData/geo.json', () => ({
  default: {
    features: [
      {
        properties: {
          name: 'United States',
          name_en: 'United States',
          type: 'Country',
          continent: 'North America',
          subregion: 'Northern America',
          iso_a2: 'US'
        }
      },
      {
        properties: {
          name: 'Canada',
          name_en: 'Canada',
          type: 'Country',
          continent: 'North America',
          subregion: 'Northern America',
          iso_a2: 'CA'
        }
      },
      {
        properties: {
          name: 'Mexico',
          name_en: 'Mexico',
          type: 'Country',
          continent: 'North America',
          subregion: 'Central America',
          iso_a2: 'MX'
        }
      }
    ]
  }
}))

// Mock flag data
vi.mock('../Common/GeoData/countryCodes2.json', () => ({
  default: [
    { name: 'United States', code: 'us' },
    { name: 'Canada', code: 'ca' },
    { name: 'Mexico', code: 'mx' }
  ]
}))

// Mock components
vi.mock('../Globe/Globe', () => ({
  Globe: ({ selectedCountry }: { selectedCountry: string }) => (
    <div data-testid="globe">Globe: {selectedCountry}</div>
  )
}))

interface MockQuizProps {
  onSubmit: (isCorrect: boolean) => void
  onComplete?: () => void
  disabled: boolean
  correctOption: { name: string; code: string; translatedName: string }
}

vi.mock('../Quiz/Quiz', () => ({
  Quiz: ({ onSubmit, onComplete, disabled, correctOption }: MockQuizProps) => {
    const handleSubmit = (isCorrect: boolean) => {
      onSubmit(isCorrect)
      // Simulate the Quiz component's timeout behavior
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    }

    return (
      <div data-testid="quiz">
        <button
          data-testid="correct-answer"
          onClick={() => handleSubmit(true)}
          disabled={disabled}
        >
          {correctOption}
        </button>
        <button
          data-testid="wrong-answer"
          onClick={() => handleSubmit(false)}
          disabled={disabled}
        >
          Wrong Answer
        </button>
      </div>
    )
  }
}))

vi.mock('./Score', () => ({
  Score: ({ correctScore, wrongScore }: { correctScore: number; wrongScore: number }) => (
    <div data-testid="score">Score: {correctScore}/{wrongScore}</div>
  )
}))

vi.mock('../MainMenu/MainMenu', () => ({
  MainMenu: () => <div data-testid="main-menu">Main Menu</div>
}))

vi.mock('../Common/Auth/AuthModal', () => ({
  AuthModal: ({ open, onClose, initialMode }: { open: boolean; onClose: () => void; initialMode?: string }) => {
    const [currentMode, setCurrentMode] = React.useState(initialMode || 'login')

    return open ? (
      <div data-testid="auth-modal">
        <div data-testid="auth-modal-mode">{currentMode}</div>
        <button data-testid="auth-modal-close" onClick={onClose}>Close</button>
        <button
          data-testid="switch-to-register"
          onClick={() => setCurrentMode('register')}
        >
          Switch to Register
        </button>
        <button
          data-testid="switch-to-login"
          onClick={() => setCurrentMode('login')}
        >
          Switch to Login
        </button>
        <button data-testid="continue-without-auth" onClick={onClose}>Continue without login</button>
      </div>
    ) : null
  }
}))

const mockUseAuth = vi.mocked(useAuth)
const mockUseOfflineDetector = vi.mocked(useOfflineDetector)
const mockGameProgressService = vi.mocked(gameProgressService)

describe('CountryQuiz', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn(),
    })

    mockUseOfflineDetector.mockReturnValue({
      isOnline: true,
      isOffline: false,
      networkStatus: {
        isOnline: true,
        isOffline: false
      },
      testConnectivity: vi.fn()
    })

    mockGameProgressService.saveGameProgress = vi.fn().mockResolvedValue(undefined)
    mockGameProgressService.saveTempSession = vi.fn()
    mockGameProgressService.hasPendingOfflineSessions = vi.fn().mockReturnValue(false)
    mockGameProgressService.syncOfflineSessionsManually = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the game components correctly', () => {
    render(<CountryQuiz />)

    expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    expect(screen.getByTestId('globe')).toBeInTheDocument()
    expect(screen.getByTestId('quiz')).toBeInTheDocument()
    expect(screen.getByTestId('score')).toBeInTheDocument()
  })

  it('shows offline indicator when offline', () => {
    mockUseOfflineDetector.mockReturnValue({
      isOnline: false,
      isOffline: true,
      networkStatus: {
        isOnline: false,
        isOffline: true
      },
      testConnectivity: vi.fn()
    })

    render(<CountryQuiz />)

    expect(screen.getByText('🔴 Offline Mode')).toBeInTheDocument()
  })

  it('saves progress automatically for authenticated users', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      provider: 'email' as const,
      createdAt: new Date()
    }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    render(<CountryQuiz />)

    // Answer a question correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    await waitFor(() => {
      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        'user123',
        'countries',
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })
  })

  it('saves progress temporarily for unauthenticated users', async () => {
    render(<CountryQuiz />)

    // Answer a question correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    await waitFor(() => {
      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })
  })

  it('handles offline mode gracefully', async () => {
    mockUseOfflineDetector.mockReturnValue({
      isOnline: false,
      isOffline: true,
      networkStatus: {
        isOnline: false,
        isOffline: true
      },
      testConnectivity: vi.fn()
    })

    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      provider: 'email' as const,
      createdAt: new Date()
    }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    // Mock save to fail (simulating offline)
    mockGameProgressService.saveGameProgress = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<CountryQuiz />)

    // Answer a question correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    await waitFor(() => {
      expect(screen.getByText('Saved offline - will sync when online')).toBeInTheDocument()
    })
  })

  it('syncs offline sessions when coming back online', async () => {
    mockGameProgressService.hasPendingOfflineSessions = vi.fn().mockReturnValue(true)

    // Start offline
    mockUseOfflineDetector.mockReturnValue({
      isOnline: false,
      isOffline: true,
      networkStatus: {
        isOnline: false,
        isOffline: true
      },
      testConnectivity: vi.fn()
    })

    const { rerender } = render(<CountryQuiz />)

    // Come back online
    mockUseOfflineDetector.mockReturnValue({
      isOnline: true,
      isOffline: false,
      networkStatus: {
        isOnline: true,
        isOffline: false
      },
      testConnectivity: vi.fn()
    })

    rerender(<CountryQuiz />)

    await waitFor(() => {
      expect(mockGameProgressService.syncOfflineSessionsManually).toHaveBeenCalled()
    })
  })

  it('updates score correctly when answering questions', async () => {
    render(<CountryQuiz />)

    // Answer correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    await waitFor(() => {
      expect(screen.getByText('Score: 1/0')).toBeInTheDocument()
    })

    // Wait for the timeout and answer incorrectly
    await new Promise(resolve => setTimeout(resolve, 2100))

    const wrongButton = screen.getByTestId('wrong-answer')
    fireEvent.click(wrongButton)

    await waitFor(() => {
      expect(screen.getByTestId('score')).toHaveTextContent('Score: 1/1')
    }, { timeout: 5000 })
  })

  it('shows auth modal for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    render(<CountryQuiz />)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
  })

  it('shows auth modal in login mode by default', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    render(<CountryQuiz />)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(screen.getByTestId('auth-modal-mode')).toHaveTextContent('login')
  })

  it('does not show auth modal for authenticated users', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      provider: 'email' as const,
      createdAt: new Date()
    }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    render(<CountryQuiz />)

    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
  })

  it('does not show auth modal when user has declined auth', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    render(<CountryQuiz />)

    // Initially shows auth modal
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()

    // Click "Continue without login"
    const continueButton = screen.getByTestId('continue-without-auth')
    fireEvent.click(continueButton)

    // Modal should be closed and not show again
    await waitFor(() => {
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
    })
  })

  it('closes auth modal when user clicks close button', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    render(<CountryQuiz />)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()

    // Click close button
    const closeButton = screen.getByTestId('auth-modal-close')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
    })
  })

  it('preserves hasDeclinedAuth state during component lifecycle', async () => {
    const mockAuthReturn = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    }

    mockUseAuth.mockReturnValue(mockAuthReturn)

    const { rerender } = render(<CountryQuiz />)

    // Initially shows auth modal
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()

    // Click "Continue without login"
    const continueButton = screen.getByTestId('continue-without-auth')
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
    })

    // Rerender component (simulating props change or other updates)
    rerender(<CountryQuiz />)

    // Modal should still not appear
    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
  })

  it('allows switching between login and register modes in auth modal', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    render(<CountryQuiz />)

    // Initially in login mode
    expect(screen.getByTestId('auth-modal-mode')).toHaveTextContent('login')

    // Switch to register mode
    const switchToRegisterButton = screen.getByTestId('switch-to-register')
    fireEvent.click(switchToRegisterButton)

    expect(screen.getByTestId('auth-modal-mode')).toHaveTextContent('register')

    // Switch back to login mode
    const switchToLoginButton = screen.getByTestId('switch-to-login')
    fireEvent.click(switchToLoginButton)

    expect(screen.getByTestId('auth-modal-mode')).toHaveTextContent('login')
  })

  it('shows saving indicator when saving progress', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      provider: 'email' as const,
      createdAt: new Date()
    }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      loginWithOAuth: vi.fn()
    })

    // Mock save to be slow
    mockGameProgressService.saveGameProgress = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<CountryQuiz />)

    // Answer a question correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    // Should show saving indicator
    expect(screen.getByText('💾 Saving...')).toBeInTheDocument()

    // Wait for save to complete
    await waitFor(() => {
      expect(screen.queryByText('💾 Saving...')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })
})