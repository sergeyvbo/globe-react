import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

// Mock the AuthContext
vi.mock('./Common/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn()
  })
}))

// Mock the quiz components
vi.mock('./CountryQuiz/CountryQuiz', () => ({
  CountryQuiz: () => <div data-testid="country-quiz">Country Quiz</div>
}))

vi.mock('./FlagQuiz/FlagQuiz', () => ({
  FlagQuiz: () => <div data-testid="flag-quiz">Flag Quiz</div>
}))

vi.mock('./StateQuiz/StateQuiz', () => ({
  StateQuiz: () => <div data-testid="state-quiz">State Quiz</div>
}))

// Mock the UserProfile component
vi.mock('./Common/UserProfile', () => ({
  UserProfile: () => <div data-testid="user-profile">User Profile</div>
}))

// Mock the Statistics components
vi.mock('./Statistics', () => ({
  StatsPage: () => <div data-testid="stats-page">Stats Page</div>,
  LeaderboardPage: () => <div data-testid="leaderboard-page">Leaderboard Page</div>
}))

// Mock the Modal components
vi.mock('./Common/Modals', () => ({
  ModalProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-provider">{children}</div>,
  UserProfileModal: () => <div data-testid="user-profile-modal">User Profile Modal</div>,
  StatisticsModal: () => <div data-testid="statistics-modal">Statistics Modal</div>,
  LeaderboardModal: () => <div data-testid="leaderboard-modal">Leaderboard Modal</div>
}))

describe('App Routing', () => {
  beforeEach(() => {
    // Reset window location hash
    window.location.hash = ''
  })

  test('renders CountryQuiz by default', () => {
    render(<App />)
    expect(screen.getByTestId('country-quiz')).toBeInTheDocument()
  })

  test('renders CountryQuiz for /countries route', () => {
    window.location.hash = '#/countries'
    render(<App />)
    expect(screen.getByTestId('country-quiz')).toBeInTheDocument()
  })

  test('renders FlagQuiz for /flags route', () => {
    window.location.hash = '#/flags'
    render(<App />)
    expect(screen.getByTestId('flag-quiz')).toBeInTheDocument()
  })

  test('renders StateQuiz for /states route', () => {
    window.location.hash = '#/states'
    render(<App />)
    expect(screen.getByTestId('state-quiz')).toBeInTheDocument()
  })

  test('renders ProtectedRoute for /profile route when not authenticated', () => {
    window.location.hash = '#/profile'
    render(<App />)
    
    // Should show the "must be logged in" message from ProtectedRoute
    expect(screen.getByText(/you must be logged in/i)).toBeInTheDocument()
    expect(screen.getByText(/back to home/i)).toBeInTheDocument()
  })

  test('renders LeaderboardPage for /leaderboard route', () => {
    window.location.hash = '#/leaderboard'
    render(<App />)
    expect(screen.getByTestId('leaderboard-page')).toBeInTheDocument()
  })
})

describe('Modal Integration', () => {
  beforeEach(() => {
    // Reset window location hash
    window.location.hash = ''
  })

  test('renders ModalProvider wrapper', () => {
    render(<App />)
    expect(screen.getByTestId('modal-provider')).toBeInTheDocument()
  })

  test('renders all modal components at app level', () => {
    render(<App />)
    expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument()
    expect(screen.getByTestId('statistics-modal')).toBeInTheDocument()
    expect(screen.getByTestId('leaderboard-modal')).toBeInTheDocument()
  })

  test('modals are rendered alongside quiz components', () => {
    // Reset hash to ensure we're on the default route
    window.location.hash = ''
    render(<App />)
    // Default route shows CountryQuiz
    expect(screen.getByTestId('country-quiz')).toBeInTheDocument()
    // Modals should also be present
    expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument()
    expect(screen.getByTestId('statistics-modal')).toBeInTheDocument()
    expect(screen.getByTestId('leaderboard-modal')).toBeInTheDocument()
  })

  test('modals are available on different quiz pages', () => {
    // Test on flags page
    window.location.hash = '#/flags'
    render(<App />)
    expect(screen.getByTestId('flag-quiz')).toBeInTheDocument()
    expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument()
    expect(screen.getByTestId('statistics-modal')).toBeInTheDocument()
    expect(screen.getByTestId('leaderboard-modal')).toBeInTheDocument()
  })
})

// Note: The ProtectedRoute correctly prevents access to /profile when not authenticated
// and would show UserProfile when authenticated. The routing implementation is working correctly.