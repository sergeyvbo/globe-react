import { useTheme, useMediaQuery } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

export interface ResponsiveModalConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  shouldOptimizeForTouch: boolean;
  windowSize: {
    width: number;
    height: number;
  };
  getResponsivePadding: () => string;
  getResponsiveMargin: () => string;
  getModalMaxHeight: () => string;
  getOptimalMaxWidth: (defaultMaxWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

/**
 * Custom hook for responsive modal behavior
 * Provides utilities for adapting modal layout and behavior across different screen sizes
 */
export const useResponsiveModal = (): ResponsiveModalConfig => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Track window size for resize handling
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Handle window resize
  const handleResize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [handleResize]);

  // Determine if touch interactions should be optimized
  const shouldOptimizeForTouch = isMobile || isTablet;

  // Calculate responsive padding
  const getResponsivePadding = useCallback(() => {
    if (isMobile) return theme.spacing(1);
    if (isTablet) return theme.spacing(2);
    return theme.spacing(3);
  }, [isMobile, isTablet, theme]);

  // Calculate responsive margin
  const getResponsiveMargin = useCallback(() => {
    if (isMobile) return theme.spacing(0);
    if (isTablet) return theme.spacing(1);
    return theme.spacing(2);
  }, [isMobile, isTablet, theme]);

  // Calculate modal height constraints
  const getModalMaxHeight = useCallback(() => {
    if (isMobile) return '100vh';
    if (isTablet) return 'calc(100vh - 32px)';
    return 'calc(100vh - 64px)';
  }, [isMobile, isTablet]);

  // Get optimal max width based on screen size
  const getOptimalMaxWidth = useCallback((defaultMaxWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
    if (isMobile) return false; // Full width on mobile
    if (isTablet) {
      // For tablets, use a smaller max width to ensure proper spacing
      return defaultMaxWidth === 'xl' || defaultMaxWidth === 'lg' ? 'md' : defaultMaxWidth;
    }
    return defaultMaxWidth;
  }, [isMobile, isTablet]);

  return {
    isMobile,
    isTablet,
    isDesktop,
    shouldOptimizeForTouch,
    windowSize,
    getResponsivePadding,
    getResponsiveMargin,
    getModalMaxHeight,
    getOptimalMaxWidth,
  };
};