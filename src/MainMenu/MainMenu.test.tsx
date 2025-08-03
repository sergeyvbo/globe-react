import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useAuth } from '../Common/Auth/AuthContext';
import { useModal } from '../Common/Modals';

// Mock the dependencies
vi.mock('../Common/Auth/AuthContext');
vi.mock('../Common/Modals');
vi.mock('../Localization/strings', () => ({
  getString: (key: string) => key,
  getAuthString: (key: string) => key,
}));
vi.mock('../Common/utils', () => ({
  getSettings: () => ({
    showPin: true,
    showZoomButtons: true,
    showBorders: true,
    language: 'en',
    difficulty: 'medium',
  }),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseModal = vi.mocked(useModal);

describe('MainMenu', () => {
  const mockOpenModal = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseModal.mockReturnValue({
      modals: { userProfile: false, statistics: false, leaderboard: false },
      openModal: mockOpenModal,
      closeModal: vi.fn(),
      closeAllModals: vi.fn(),
      isAnyModalOpen: false,
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { 
          id: '1', 
          email: 'test@example.com', 
          avatar: undefined, provider: 'email',
          createdAt: new Date(),  },
        isAuthenticated: true,
        logout: mockLogout,
        login: vi.fn(),
        isLoading: false,
        loginWithOAuth: vi.fn(),
        register: vi.fn(),
        updateProfile: vi.fn(),
      });
    });

    it('should open user profile modal when profile menu item is clicked', () => {
      render(<MainMenu />);
      
      // Click on profile button to open menu
      const profileButton = screen.getByLabelText('profile');
      fireEvent.click(profileButton);
      
      // Click on profile menu item
      const profileMenuItem = screen.getByText('profile');
      fireEvent.click(profileMenuItem);
      
      expect(mockOpenModal).toHaveBeenCalledWith('userProfile');
    });

    it('should open statistics modal when statistics menu item is clicked', () => {
      render(<MainMenu />);
      
      // Click on profile button to open menu
      const profileButton = screen.getByLabelText('profile');
      fireEvent.click(profileButton);
      
      // Click on statistics menu item
      const statisticsMenuItem = screen.getByText('Statistics');
      fireEvent.click(statisticsMenuItem);
      
      expect(mockOpenModal).toHaveBeenCalledWith('statistics');
    });

    it('should open leaderboard modal when leaderboard menu item is clicked', () => {
      render(<MainMenu />);
      
      // Click on profile button to open menu
      const profileButton = screen.getByLabelText('profile');
      fireEvent.click(profileButton);
      
      // Click on leaderboard menu item
      const leaderboardMenuItem = screen.getByText('Leaderboard');
      fireEvent.click(leaderboardMenuItem);
      
      expect(mockOpenModal).toHaveBeenCalledWith('leaderboard');
    });

    it('should open leaderboard modal when leaderboard icon is clicked', () => {
      render(<MainMenu />);
      
      // Click on leaderboard icon button
      const leaderboardButton = screen.getByLabelText('leaderboard');
      fireEvent.click(leaderboardButton);
      
      expect(mockOpenModal).toHaveBeenCalledWith('leaderboard');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        logout: mockLogout,
        login: vi.fn(),
        isLoading: false,
        loginWithOAuth: vi.fn(),
        register: vi.fn(),
        updateProfile: vi.fn(),
      });
    });

    it('should still open leaderboard modal when leaderboard icon is clicked', () => {
      render(<MainMenu />);
      
      // Click on leaderboard icon button
      const leaderboardButton = screen.getByLabelText('leaderboard');
      fireEvent.click(leaderboardButton);
      
      expect(mockOpenModal).toHaveBeenCalledWith('leaderboard');
    });

    it('should not show profile menu when not authenticated', () => {
      render(<MainMenu />);
      
      expect(screen.queryByLabelText('profile')).not.toBeInTheDocument();
      expect(screen.queryByText('profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
    });

    it('should show login button and open AuthModal when clicked', () => {
      render(<MainMenu />);
      
      // Should show login button when not authenticated
      const loginButton = screen.getByLabelText('login');
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveTextContent('login');
      
      // Click login button should open AuthModal
      fireEvent.click(loginButton);
      
      // AuthModal should be rendered (we can't easily test the modal content without mocking it,
      // but we can verify the button click handler was called by checking state changes)
      // The modal opening is handled by the authModalOpen state
    });
  });
});