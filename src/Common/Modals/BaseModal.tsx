import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useTheme,
  Slide,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { BaseModalProps } from './types';
import { useResponsiveModal } from './useResponsiveModal';

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
  const firstFocusableElementRef = useRef<HTMLButtonElement | null>(null);
  
  // Use responsive modal hook for all responsive behavior
  const {
    isMobile,
    isTablet,
    isDesktop,
    shouldOptimizeForTouch,
    getResponsivePadding,
    getResponsiveMargin,
    getModalMaxHeight,
    getOptimalMaxWidth
  } = useResponsiveModal();



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

  // Prevent modal content clicks from bubbling to backdrop
  const handleModalContentClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  // Get optimal modal sizing
  const modalMaxWidth = getOptimalMaxWidth(maxWidth);
  const modalFullScreen = isMobile; // Full screen on mobile only

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={modalMaxWidth}
      fullWidth={fullWidth}
      fullScreen={modalFullScreen}
      slots={{
        transition: Transition,
      }}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      role="dialog"
      aria-modal={true}
      onKeyDown={handleKeyDown}

      sx={{
        // Only apply high z-index when modal is actually open
        ...(open && {
          zIndex: theme.zIndex.modal + 10,
        }),
        '& .MuiDialog-paper': {
          margin: getResponsiveMargin(),
          maxHeight: getModalMaxHeight(),
          borderRadius: isMobile ? 0 : theme.shape.borderRadius,
          // Responsive width constraints
          width: isMobile ? '100%' : isTablet ? '90%' : 'auto',
          // Ensure proper spacing on different screen sizes
          ...(isTablet && {
            maxWidth: '90vw',
          }),
          ...(isDesktop && {
            minWidth: '400px',
          }),
          // Touch-friendly sizing
          ...(shouldOptimizeForTouch && {
            '& .MuiDialogTitle-root': {
              minHeight: '56px', // Larger touch target
            },
            '& .MuiIconButton-root': {
              minWidth: '44px',
              minHeight: '44px',
            },
          }),
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          // Prevent backdrop scroll on mobile
          ...(isMobile && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }),
        },
      }}
    >
      <DialogTitle
        id="modal-title"
        onClick={handleModalContentClick}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: getResponsivePadding(),
          paddingRight: theme.spacing(1),
          borderBottom: `1px solid ${theme.palette.divider}`,
          // Ensure proper spacing on mobile
          minHeight: shouldOptimizeForTouch ? '56px' : 'auto',
          // Prevent any layout issues
          flexShrink: 0,
        }}
      >
        <Box 
          component="span" 
          sx={{ 
            fontWeight: 'bold',
            fontSize: isMobile ? '1.1rem' : isTablet ? '1.25rem' : '1.5rem',
            // Prevent text overflow on small screens
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            marginRight: theme.spacing(1),
          }}
        >
          {title}
        </Box>
        <IconButton
          ref={firstFocusableElementRef}
          aria-label="close modal"
          onClick={onClose}
          size={shouldOptimizeForTouch ? "medium" : "small"}
          sx={{
            color: theme.palette.grey[500],
            minWidth: shouldOptimizeForTouch ? '44px' : 'auto',
            minHeight: shouldOptimizeForTouch ? '44px' : 'auto',
            flexShrink: 0,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            // Larger touch target on mobile
            ...(shouldOptimizeForTouch && {
              padding: theme.spacing(1.5),
            }),
          }}
        >
          <Close fontSize={shouldOptimizeForTouch ? "medium" : "small"} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        id="modal-description"
        onClick={handleModalContentClick}
        sx={{
          padding: getResponsivePadding(),
          overflow: 'auto',
          // Responsive scrollbar styling
          '&::-webkit-scrollbar': {
            width: shouldOptimizeForTouch ? '12px' : '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.grey[100],
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.grey[400],
            borderRadius: '4px',
            // Larger scrollbar thumb for touch devices
            ...(shouldOptimizeForTouch && {
              minHeight: '40px',
            }),
          },
          // Touch-friendly content spacing
          '& > *:not(:last-child)': {
            marginBottom: shouldOptimizeForTouch ? theme.spacing(2) : theme.spacing(1),
          },
          // Responsive content layout
          '& .MuiCard-root': {
            marginBottom: theme.spacing(2),
            // Adjust card padding for different screen sizes
            '& .MuiCardContent-root': {
              padding: isMobile ? theme.spacing(1.5) : theme.spacing(2),
              '&:last-child': {
                paddingBottom: isMobile ? theme.spacing(1.5) : theme.spacing(2),
              },
            },
          },
          // Responsive form elements
          '& .MuiTextField-root': {
            marginBottom: theme.spacing(2),
          },
          '& .MuiButton-root': {
            minHeight: shouldOptimizeForTouch ? '44px' : 'auto',
            ...(shouldOptimizeForTouch && {
              padding: `${theme.spacing(1.5)} ${theme.spacing(3)}`,
            }),
          },
          // Grid responsive behavior
          '& .MuiGrid-container': {
            '& .MuiGrid-item': {
              ...(isMobile && {
                '&.MuiGrid-grid-xs-6': {
                  flexBasis: '50%',
                  maxWidth: '50%',
                },
                '&.MuiGrid-grid-sm-3': {
                  flexBasis: '50%',
                  maxWidth: '50%',
                },
              }),
            },
          },
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};