import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { CountryQuiz } from './CountryQuiz'
import { AuthProvider } from '../Common/AuthContext'

// Mock the AuthContext
const mockAuthContext = {
    user: null as any,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    loginWithOAuth: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn()
}

vi.mock('../Common/AuthContext', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useAuth: () => mockAuthContext
}))

// Mock the Globe component
vi.mock('../Globe/Globe', () => ({
    Globe: () => <div data-testid="globe">Globe Component</div>
}))

// Mock the Quiz component
vi.mock('../Quiz/Quiz', () => ({
    Quiz: () => <div data-testid="quiz">Quiz Component</div>
}))

// Mock the Score component
vi.mock('./Score', () => ({
    Score: () => <div data-testid="score">Score Component</div>
}))

// Mock the MainMenu component
vi.mock('../MainMenu/MainMenu', () => ({
    MainMenu: () => <div data-testid="main-menu">Main Menu</div>
}))

// Mock the AuthModal component
vi.mock('../Common/AuthModal', () => ({
    AuthModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
        open ? (
            <div data-testid="auth-modal">
                <button onClick={onClose}>Continue without login</button>
            </div>
        ) : null
    )
}))

describe('CountryQuiz Auth Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('shows auth modal for unauthenticated users', async () => {
        render(
            <AuthProvider>
                <CountryQuiz />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
        })
    })

    it('does not show auth modal for authenticated users', async () => {
        // Mock authenticated user
        mockAuthContext.isAuthenticated = true
        mockAuthContext.user = {
            id: '1',
            email: 'test@example.com',
            provider: 'email',
            createdAt: new Date(),
            lastLoginAt: new Date()
        }

        render(
            <AuthProvider>
                <CountryQuiz />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
        })

        // Reset for other tests
        mockAuthContext.isAuthenticated = false
        mockAuthContext.user = null
    })

    it('renders all game components', async () => {
        render(
            <AuthProvider>
                <CountryQuiz />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
            expect(screen.getByTestId('globe')).toBeInTheDocument()
            expect(screen.getByTestId('quiz')).toBeInTheDocument()
            expect(screen.getByTestId('score')).toBeInTheDocument()
        })
    })
})