import React, { useCallback } from 'react';
import {
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { BaseModal } from './BaseModal';
import { useModal } from './useModal';
import { Leaderboard } from '../../Statistics/Leaderboard';

// Wrapper component to adapt Leaderboard for modal display
const LeaderboardContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Determine page size based on screen size for better modal experience
  const getPageSize = () => {
    if (isMobile) return 10; // Smaller page size for mobile
    if (isTablet) return 15; // Medium page size for tablet
    return 20; // Default page size for desktop
  };

  return (
    <Box
      sx={{
        // Remove default padding from Leaderboard component since BaseModal handles it
        '& .MuiBox-root:first-of-type': {
          padding: 0,
        },
        // Adapt table sizing for modal display
        '& .MuiTableContainer-root': {
          maxHeight: isMobile ? '60vh' : '70vh',
          overflowY: 'auto',
        },
        // Ensure proper spacing in modal context
        '& .MuiCard-root': {
          boxShadow: 'none',
          border: 'none',
          backgroundColor: 'transparent',
        },
        // Optimize filter controls for modal
        '& .MuiFormControl-root': {
          minWidth: isMobile ? 120 : 150,
        },
        // Adjust pagination for modal
        '& .MuiPagination-root': {
          justifyContent: 'center',
        },
        // Responsive table adjustments
        [theme.breakpoints.down('sm')]: {
          '& .MuiTableCell-root': {
            padding: theme.spacing(1),
            fontSize: '0.875rem',
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            fontSize: '0.75rem',
            fontWeight: 600,
          },
        },
        // Ensure proper scrolling behavior
        '& .MuiTableContainer-root::-webkit-scrollbar': {
          width: '8px',
        },
        '& .MuiTableContainer-root::-webkit-scrollbar-track': {
          backgroundColor: theme.palette.grey[100],
        },
        '& .MuiTableContainer-root::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.grey[400],
          borderRadius: '4px',
        },
      }}
    >
      <Leaderboard 
        className="leaderboard-modal-content"
        pageSize={getPageSize()}
      />
    </Box>
  );
};

export const LeaderboardModal: React.FC = () => {
  const { modals, closeModal } = useModal();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClose = useCallback(() => {
    closeModal('leaderboard');
  }, [closeModal]);

  return (
    <BaseModal
      open={modals.leaderboard}
      onClose={handleClose}
      title="Leaderboard"
      maxWidth="lg"
      fullWidth
      // Allow backdrop click to close on desktop, but not on mobile for better UX
      disableBackdropClick={isMobile}
    >
      <LeaderboardContent />
    </BaseModal>
  );
};

export default LeaderboardModal;