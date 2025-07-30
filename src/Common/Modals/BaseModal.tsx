import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useTheme,
  useMediaQuery,
  Slide,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { BaseModalProps } from './types';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onClose,
  title,
  maxWidth = 'md',
  fullWidth = true,
  children,
  disableEscapeKeyDown = false,
  disableBackdropClick = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const firstFocusableElementRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusableElementRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (open) {
      // Set focus to the first focusable element when modal opens
      const timer = setTimeout(() => {
        const firstFocusable = firstFocusableElementRef.current;
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open]);

  // Trap focus within modal
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusableElements) as HTMLElement[];
      const modalElements = focusableArray.filter(el => 
        document.querySelector('[role="dialog"]')?.contains(el)
      );

      if (modalElements.length === 0) return;

      const firstElement = modalElements[0];
      const lastElement = modalElements[modalElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const handleClose = (event: {}, reason?: string) => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return;
    }
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') {
      return;
    }
    onClose();
  };

  // Determine modal sizing based on screen size
  const getModalMaxWidth = () => {
    if (isMobile) return false; // Full width on mobile
    if (isTablet) return 'md';
    return maxWidth;
  };

  const getModalFullScreen = () => {
    return isMobile; // Full screen on mobile
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={getModalMaxWidth()}
      fullWidth={fullWidth}
      fullScreen={getModalFullScreen()}
      TransitionComponent={Transition}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      role="dialog"
      aria-modal={true}
      onKeyDown={handleKeyDown}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : theme.spacing(2),
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
          borderRadius: isMobile ? 0 : theme.shape.borderRadius,
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }
      }}
    >
      <DialogTitle
        id="modal-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingRight: theme.spacing(1),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box component="span" sx={{ fontWeight: 'bold' }}>
          {title}
        </Box>
        <IconButton
          ref={firstFocusableElementRef}
          aria-label="close modal"
          onClick={onClose}
          size="small"
          sx={{
            color: theme.palette.grey[500],
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent
        id="modal-description"
        sx={{
          padding: theme.spacing(2),
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.grey[100],
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.grey[400],
            borderRadius: '4px',
          },
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};