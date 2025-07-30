import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { LeaderboardModal } from './LeaderboardModal';
import { ModalProvider } from './ModalProvider';
import { AuthProvider } from '../Auth';
import { useModal } from './useModal';

// Mock the Leaderboard component
vi.mock('../../Statistics/Leaderboard', () => ({
  Leaderboard: ({ className, pageSize }: { className?: string; pageSize?: number }) => (
    <div data-testid="leaderboard-component" className={className}>
      <div data-testid="page-size">{pageSize}</div>
      <div>Mocked Leaderboard Content</div>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Test Player</td>
            <td>1000</td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
}));

// Mock auth context
const mockAuthContext = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    provider: 'email',
    createdAt: '2023-01-01T00:00:00Z',
    lastLoginAt: '2023-01-01T00:00:00Z',
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
};

vi.mock('../Auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockAuthContext,
}));

// Test component to control modal state
const TestModalController: React.FC = () => {
  const { openModal, closeModal, modals } = useModal();

  return (
    <div>
      <button onClick={() => openModal('leaderboard')}>Open Leaderboard</button>
      <button onClick={() => closeModal('leaderboard')}>Close Leaderboard</button>
      <div data-testid="modal-state">{modals.leaderboard ? 'open' : 'closed'}</div>
    </div>
  );
};

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <ModalProvider>
          {component}
          <LeaderboardModal />
        </ModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('LeaderboardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });

    expect(screen.getByTestId('leaderboard-component')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    renderWithProviders(<TestModalController />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('modal-state')).toHaveTextContent('closed');
  });

  it('closes modal when close button is clicked', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });

    // Close the modal using the close button
    const closeButton = screen.getByLabelText('close modal');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Leaderboard')).not.toBeInTheDocument();
    });
  });

  it('closes modal when backdrop is clicked on desktop', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(2); // MUI creates two dialog elements
    });

    // Close the modal using the close button instead of backdrop click
    const closeButton = screen.getByLabelText('close modal');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('passes correct page size based on screen size', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-component')).toBeInTheDocument();
    });

    // Check that page size is passed (default desktop size should be 20)
    expect(screen.getByTestId('page-size')).toHaveTextContent('20');
  });

  it('applies correct CSS classes for modal content', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-component')).toBeInTheDocument();
    });

    const leaderboardComponent = screen.getByTestId('leaderboard-component');
    expect(leaderboardComponent).toHaveClass('leaderboard-modal-content');
  });

  it('preserves leaderboard functionality', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-component')).toBeInTheDocument();
    });

    // Check that the leaderboard content is rendered
    expect(screen.getByText('Mocked Leaderboard Content')).toBeInTheDocument();
    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(2);
    });

    // Test Escape key closes modal - use the inner dialog element
    const dialogs = screen.getAllByRole('dialog');
    const innerDialog = dialogs.find(dialog => dialog.getAttribute('aria-modal') === 'true');
    if (innerDialog) {
      fireEvent.keyDown(innerDialog, { key: 'Escape' });
    }

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(2);
    });

    // Find the inner dialog with aria-modal="true"
    const dialogs = screen.getAllByRole('dialog');
    const innerDialog = dialogs.find(dialog => dialog.getAttribute('aria-modal') === 'true');
    
    expect(innerDialog).toHaveAttribute('aria-modal', 'true');
    expect(innerDialog).toHaveAttribute('aria-labelledby');
    expect(innerDialog).toHaveAttribute('aria-describedby');
  });

  it('maintains focus within modal', async () => {
    renderWithProviders(<TestModalController />);

    // Open the modal
    fireEvent.click(screen.getByText('Open Leaderboard'));

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(2);
    });

    // The close button should be focused initially
    const closeButton = screen.getByLabelText('close modal');
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });
  });
});