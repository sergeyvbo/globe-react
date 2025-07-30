import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { StatisticsModal, resetPersistedTabState } from './StatisticsModal';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';

// Mock the Statistics components
vi.mock('../../Statistics/UserStats', () => ({
  UserStats: ({ className }: { className?: string }) => (
    <div data-testid="user-stats" className={className}>
      User Stats Component
    </div>
  )
}));

vi.mock('../../Statistics/GameHistory', () => ({
  GameHistory: ({ className, pageSize }: { className?: string; pageSize?: number }) => (
    <div data-testid="game-history" className={className} data-page-size={pageSize}>
      Game History Component
    </div>
  )
}));

// Mock useModal hook for testing
const mockCloseModal = vi.fn();
const mockUseModal = {
  modals: { statistics: false, userProfile: false, leaderboard: false },
  openModal: vi.fn(),
  closeModal: mockCloseModal,
  closeAllModals: vi.fn(),
  isAnyModalOpen: false
};

vi.mock('./useModal', () => ({
  useModal: vi.fn()
}));

const mockedUseModal = useModal as ReturnType<typeof vi.fn>;

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <ModalProvider>
        {component}
      </ModalProvider>
    </ThemeProvider>
  );
};

describe('StatisticsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPersistedTabState(); // Reset tab state between tests
    mockedUseModal.mockReturnValue(mockUseModal);
  });

  describe('Modal Rendering', () => {
    it('should not render when modal is closed', () => {
      mockedUseModal.mockReturnValue({
        ...mockUseModal,
        modals: { ...mockUseModal.modals, statistics: false }
      });

      renderWithProviders(<StatisticsModal />);
      
      expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
    });

    it('should render when modal is open', () => {
      mockedUseModal.mockReturnValue({
        ...mockUseModal,
        modals: { ...mockUseModal.modals, statistics: true }
      });

      renderWithProviders(<StatisticsModal />);
      
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });
  });

  describe('Tab Functionality', () => {
    beforeEach(() => {
      mockedUseModal.mockReturnValue({
        ...mockUseModal,
        modals: { ...mockUseModal.modals, statistics: true }
      });
    });

    it('should render both tabs', () => {
      renderWithProviders(<StatisticsModal />);
      
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /game history/i })).toBeInTheDocument();
    });

    it('should show Overview tab content by default', () => {
      renderWithProviders(<StatisticsModal />);
      
      expect(screen.getByTestId('user-stats')).toBeInTheDocument();
      expect(screen.queryByTestId('game-history')).not.toBeInTheDocument();
    });

    it('should switch to Game History tab when clicked', async () => {
      renderWithProviders(<StatisticsModal />);
      
      const gameHistoryTab = screen.getByRole('tab', { name: /game history/i });
      fireEvent.click(gameHistoryTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('game-history')).toBeInTheDocument();
        expect(screen.queryByTestId('user-stats')).not.toBeInTheDocument();
      });
    });

    it('should start with initialTab when provided', () => {
      renderWithProviders(<StatisticsModal initialTab={1} />);
      
      expect(screen.getByTestId('game-history')).toBeInTheDocument();
      expect(screen.queryByTestId('user-stats')).not.toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    beforeEach(() => {
      mockedUseModal.mockReturnValue({
        ...mockUseModal,
        modals: { ...mockUseModal.modals, statistics: true }
      });
    });

    it('should pass className to UserStats component', () => {
      renderWithProviders(<StatisticsModal />);
      
      const userStats = screen.getByTestId('user-stats');
      expect(userStats).toHaveClass('statistics-modal-content');
    });

    it('should pass className and pageSize to GameHistory component', async () => {
      renderWithProviders(<StatisticsModal />);
      
      // Switch to Game History tab
      const gameHistoryTab = screen.getByRole('tab', { name: /game history/i });
      fireEvent.click(gameHistoryTab);
      
      await waitFor(() => {
        const gameHistory = screen.getByTestId('game-history');
        expect(gameHistory).toHaveClass('statistics-modal-content');
        expect(gameHistory).toHaveAttribute('data-page-size', '10');
      });
    });
  });

  describe('Modal Closing', () => {
    beforeEach(() => {
      mockedUseModal.mockReturnValue({
        ...mockUseModal,
        modals: { ...mockUseModal.modals, statistics: true }
      });
    });

    it('should call closeModal when close button is clicked', () => {
      renderWithProviders(<StatisticsModal />);
      
      const closeButton = screen.getByLabelText('close modal');
      fireEvent.click(closeButton);
      
      expect(mockCloseModal).toHaveBeenCalledWith('statistics');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing useModal context gracefully', () => {
      mockedUseModal.mockImplementation(() => {
        throw new Error('useModal must be used within a ModalProvider');
      });

      expect(() => {
        renderWithProviders(<StatisticsModal />);
      }).toThrow('useModal must be used within a ModalProvider');
    });
  });
});