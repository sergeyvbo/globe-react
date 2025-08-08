import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StateQuiz } from './StateQuiz'
import { useAuth } from '../Common/Auth/AuthContext'
import { useOfflineDetector } from '../Common/Network/useOfflineDetector'
import { gameProgressService } from '../Common/GameProgress/GameProgressService'
import { useSaveErrorHandler } from '../Common/ErrorHandling/useSaveErrorHandler'
import { useBaseQuiz } from '../Common/Hooks/useBaseQuiz'

// Mock dependencies
vi.mock('../Common/Auth/AuthContext')
vi.mock('../Common/Network/useOfflineDetector')
vi.mock('../Common/GameProgress/GameProgressService')
vi.mock('../Common/ErrorHandling/useSaveErrorHandler')
vi.mock('../Common/Hooks/useBaseQuiz')
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
vi.mock('../Common/GeoData/us.json', () => ({
  default: {
    features: [
      {
        properties: {
          NAME: 'California',
          STATE: 'CA'
        }
      },
      {
        properties: {
          NAME: 'Texas',
          STATE: 'TX'
        }
      },
      {
        properties: {
          NAME: 'Florida',
          STATE: 'FL'
        }
      }
    ]
  }
}))

// Mock components
vi.mock('./Map', () => ({
  Map: ({ selected }: { selected: string }) => (
    <div data-testid="map">Map: {selected}</div>
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

vi.mock('../CountryQuiz/Score', () => ({
  Score: ({ correctScore, wrongScore }: { correctScore: number; wrongScore: number }) => (
    <div data-testid="score">Score: {correctScore}/{wrongScore}</div>
  )
}))

vi.mock('../CountryQuiz/CountryMainMenu', () => ({
  CountryMainMenu: () => <div data-testid="country-main-menu">Country Main Menu</div>
}))

const mockUseAuth = vi.mocked(useAuth)
const mockUseOfflineDetector = vi.mocked(useOfflineDetector)
const mockGameProgressService = vi.mocked(gameProgressService)
const mockUseSaveErrorHandler = vi.mocked(useSaveErrorHandler)
const mockUseBaseQuiz = vi.mocked(useBaseQuiz)

describe('StateQuiz', () => {
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
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
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

    // Mock useSaveErrorHandler
    mockUseSaveErrorHandler.mockReturnValue({
      error: null,
      isRetrying: false,
      retryCount: 0,
      handleError: vi.fn(),
      retry: vi.fn(),
      clearError: vi.fn(),
      canRetry: false,
      setRetryOperation: vi.fn(),
      isOffline: false,
      getUserMessage: null,
      getDisplayConfig: null
    })

    // Mock useBaseQuiz
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 0,
      wrongScore: 0,
      disabled: false,
      gameSession: {
        gameType: 'states',
        correctAnswers: 0,
        wrongAnswers: 0,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: false,
        saveError: null,
        autoSaveProgress: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the game components correctly', () => {
    render(<StateQuiz />)
    
    expect(screen.getByTestId('country-main-menu')).toBeInTheDocument()
    expect(screen.getByTestId('map')).toBeInTheDocument()
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

    render(<StateQuiz />)
    
    expect(screen.getByText('🔴 Offline Mode')).toBeInTheDocument()
  })

  it('saves progress automatically for authenticated users', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
    })

    render(<StateQuiz />)
    
    // Answer a question correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    await waitFor(() => {
      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        'user123',
        'states',
        expect.objectContaining({
          gameType: 'states',
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })
  })

  it('saves progress temporarily for unauthenticated users', async () => {
    render(<StateQuiz />)
    
    // Answer a question correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    await waitFor(() => {
      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'states',
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

    const mockUser = { id: 'user123', email: 'test@example.com' }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
    })

    // Mock useBaseQuiz to simulate offline save error
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 1,
      wrongScore: 0,
      disabled: false,
      gameSession: {
        gameType: 'states',
        correctAnswers: 1,
        wrongAnswers: 0,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: false,
        saveError: 'Saved offline - will sync when online',
        autoSaveProgress: vi.fn().mockRejectedValue(new Error('Network error'))
      }
    })

    render(<StateQuiz />)
    
    // Answer a question correctly
    const correctButton = screen.getByTestId('correct-answer')
    fireEvent.click(correctButton)

    // The test should pass if the game handles offline mode gracefully
    // and shows the correct score
    await waitFor(() => {
      expect(screen.getByText('Score: 1/0')).toBeInTheDocument()
    })

    // Check that offline message is displayed
    expect(screen.getByText('Saved offline - will sync when online')).toBeInTheDocument()
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

    const { rerender } = render(<StateQuiz />)

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

    rerender(<StateQuiz />)

    await waitFor(() => {
      expect(mockGameProgressService.syncOfflineSessionsManually).toHaveBeenCalled()
    })
  })

  it('updates score correctly when answering questions', async () => {
    render(<StateQuiz />)
    
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
      expect(screen.getByText('Score: 1/1')).toBeInTheDocument()
    })
  })

  it('shows saving indicator when saving progress', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
    })

    // Mock save to be slow
    mockGameProgressService.saveGameProgress = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<StateQuiz />)
    
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

  it('displays the correct state name in the map', () => {
    render(<StateQuiz />)
    
    // Should show California (first state from mocked data)
    expect(screen.getByText('Map: California')).toBeInTheDocument()
  })

  it('displays the correct state name in the quiz', () => {
    render(<StateQuiz />)
    
    // Should show California as the correct answer
    expect(screen.getByText('California')).toBeInTheDocument()
  })
})