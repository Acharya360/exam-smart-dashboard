import { useState, useEffect, useLayoutEffect } from 'react';

export interface ScreenScaleInfo {
  // Viewport dimensions
  viewportWidth: number;
  viewportHeight: number;
  
  // Physical / System screen dimensions
  screenWidth: number;
  screenHeight: number;
  availWidth: number;
  availHeight: number;
  
  // Display density & zoom
  devicePixelRatio: number;
  isHighDPI: boolean;
  
  // Responsive categories
  isMobile: boolean;       // < 768px
  isTablet: boolean;       // >= 768px && < 1024px
  isLaptop: boolean;       // >= 1024px && < 1440px
  isDesktop: boolean;      // >= 1440px && < 1920px
  isLargeDesktop: boolean; // >= 1920px && < 2560px (FHD+)
  is4K: boolean;           // >= 2560px (2K QHD, 4K UHD)
  
  // Capabilities
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  screenClass: 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'large' | '4k';
}

function getScreenScaleInfo(): ScreenScaleInfo {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 1440,
      viewportHeight: 900,
      screenWidth: 1920,
      screenHeight: 1080,
      availWidth: 1920,
      availHeight: 1040,
      devicePixelRatio: 1,
      isHighDPI: false,
      isMobile: false,
      isTablet: false,
      isLaptop: false,
      isDesktop: true,
      isLargeDesktop: false,
      is4K: false,
      isTouch: false,
      orientation: 'landscape',
      screenClass: 'desktop',
    };
  }

  const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || 768;
  const sw = window.screen?.width || vw;
  const sh = window.screen?.height || vh;
  const aw = window.screen?.availWidth || sw;
  const ah = window.screen?.availHeight || sh;
  const dpr = window.devicePixelRatio || 1;

  const isMobile = vw < 768;
  const isTablet = vw >= 768 && vw < 1024;
  const isLaptop = vw >= 1024 && vw < 1440;
  const isDesktop = vw >= 1440 && vw < 1920;
  const isLargeDesktop = vw >= 1920 && vw < 2560;
  const is4K = vw >= 2560 || sw >= 2560;

  let screenClass: ScreenScaleInfo['screenClass'] = 'desktop';
  if (isMobile) screenClass = 'mobile';
  else if (isTablet) screenClass = 'tablet';
  else if (isLaptop) screenClass = 'laptop';
  else if (isDesktop) screenClass = 'desktop';
  else if (isLargeDesktop) screenClass = 'large';
  else if (is4K) screenClass = '4k';

  const isTouch = Boolean(
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches
  );

  const orientation = vw < vh ? 'portrait' : 'landscape';

  return {
    viewportWidth: vw,
    viewportHeight: vh,
    screenWidth: sw,
    screenHeight: sh,
    availWidth: aw,
    availHeight: ah,
    devicePixelRatio: dpr,
    isHighDPI: dpr >= 1.5,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isLargeDesktop,
    is4K,
    isTouch,
    orientation,
    screenClass,
  };
}

/**
 * System-Aware Screen Scale and Viewport Adaptation Hook.
 * Updates CSS custom properties and document data-attributes in real time
 * as window resizes, zoom changes, or orientation switches.
 */
export function useScreenScale(): ScreenScaleInfo {
  const [scaleInfo, setScaleInfo] = useState<ScreenScaleInfo>(getScreenScaleInfo);

  useLayoutEffect(() => {
    let rafId: number | null = null;

    const applySystemAttributes = (info: ScreenScaleInfo) => {
      const root = document.documentElement;
      
      // Synchronize system-aware data attributes for CSS targeting
      root.setAttribute('data-screen-class', info.screenClass);
      root.setAttribute('data-is-mobile', String(info.isMobile));
      root.setAttribute('data-is-touch', String(info.isTouch));
      root.setAttribute('data-is-high-dpi', String(info.isHighDPI));
      root.setAttribute('data-orientation', info.orientation);

      // System-aware CSS variables for fluid layout computation
      root.style.setProperty('--viewport-width', `${info.viewportWidth}px`);
      root.style.setProperty('--viewport-height', `${info.viewportHeight}px`);
      root.style.setProperty('--screen-width', `${info.screenWidth}px`);
      root.style.setProperty('--screen-height', `${info.screenHeight}px`);
      root.style.setProperty('--device-pixel-ratio', `${info.devicePixelRatio}`);
    };

    const handleResizeOrZoom = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = getScreenScaleInfo();
        setScaleInfo(next);
        applySystemAttributes(next);
      });
    };

    // Initial application
    applySystemAttributes(scaleInfo);

    // Window resize event
    window.addEventListener('resize', handleResizeOrZoom, { passive: true });
    window.addEventListener('orientationchange', handleResizeOrZoom, { passive: true });

    // Detect browser zoom / DPI change via visualViewport if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResizeOrZoom, { passive: true });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResizeOrZoom);
      window.removeEventListener('orientationchange', handleResizeOrZoom);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResizeOrZoom);
      }
    };
  }, []);

  return scaleInfo;
}
