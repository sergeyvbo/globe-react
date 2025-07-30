import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserProfileModal } from './UserProfileModal';
import { ModalProvider } from './ModalProvider';

// Mock the dependencies
vi.mock('../Auth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      createdAt: '2023-01-01T00:00:00Z',
      lastLoginAt: '2023-12-01T00:00:00Z',
      avatar: null,
    },
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    isLoading: false,
    error: null,
  })),
  authService: {
    changePassword: vi.fn(),
  },
  ValidationUtils: {
    validatePassword: vi.fn(() => ({ isValid: true, message: '' })),
    validatePasswordConfirmation: vi.fn(() => ({ isValid: true, message: '' })),
  },
}));

vi.mock('../GameProgress', () => ({
  gameProgressService: {
    getGameStats: vi.fn(() => Promise.resolve({
      totalGames: 10,
      averageAccuracy: 85,
      bestStreak: 5,
      totalCorrectAnswers: 42,
      gameTypeStats: {
        countries: { games: 5, accuracy: 80, bestStreak: 3 },
        flags: { games: 3, accuracy: 90, bestStreak: 4 },
        states: { games: 2, accuracy: 85, bestStreak: 2 },
      },
      lastPlayedAt: new Date('2023-12-01T00:00:00Z'),
    })),
  },
}));

vi.mock('../../Localization/strings', () => ({
  getAuthString: (key: string) => {
    const strings: Record<string, string> = {
      userProfile: 'User Profile',
      mustBeLoggedIn: 'Must be logged in',
      memberSince: 'Member since',
      email: 'Email',
      authProvider: 'Authentication Provider',
      lastLogin: 'Last Login',
      passwordSettings: 'Password Settings',
      passwordChangeDescription: 'Change your password',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      cancel: 'Cancel',
      changing: 'Changing...',
      passwordChanged: 'Password changed successfully',
      currentPasswordRequired: 'Current password is required',
      currentPasswordIncorrect: 'Current password is incorrect',
      passwordChangeFailed: 'Password change failed',
      newPasswordDifferent: 'New password must be different',
      passwordHelperText: 'Password must be at least 8 characters',
      oauthPasswordInfo: 'Password managed by {provider}',
    };
    return strings[key] || key;
  },
}));

vi.mock('./useModal', () => ({
  useModal: vi.fn(() => ({
    modals: { userProfile: true, statistics: false, leaderboard: false },
    openModal: vi.fn(),
    closeModal: vi.fn(),
    closeAllModals: vi.fn(),
    isAnyModalOpen: true,
  })),
}));

const theme = createTheme();

const renderWithProviders = () => {
  return render(
    <ThemeProvider theme={theme}>
      <ModalProvider>
        <UserProfileModal />
      </ModalProvider>
    </ThemeProvider>
  );
};

describe('UserProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal component without crashing', () => {
    renderWithProviders();
    expect(screen.getByText('User Profile')).toBeInTheDocument();
  });

  it('displays user information', () => {
    renderWithProviders();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows password settings for email users', () => {
    renderWithProviders();
    expect(screen.getByText('Password Settings')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });
});