import { useEffect, useState } from 'react';

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  tv: 2048
};

const detect = (width) => {
  if (width >= BREAKPOINTS.tv) return 'tv';
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

export const useBreakpoint = () => {
  const [width, setWidth] = useState(typeof window === 'undefined' ? 1280 : window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const breakpoint = detect(width);
  return {
    width,
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl' || breakpoint === 'tv',
    isWide: breakpoint === '2xl' || breakpoint === 'tv',
    isTv: breakpoint === 'tv'
  };
};

export default useBreakpoint;
