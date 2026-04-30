import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceInfo {
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: Orientation;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
}

export interface MobileContextValue extends DeviceInfo {
  isOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

const MobileContext = createContext<MobileContextValue | null>(null);

export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
}

const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
  ultra: 1536,
};

function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
}

function getOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export interface MobileProviderProps {
  children: ReactNode;
  swipeThreshold?: number;
  enableSwipeGestures?: boolean;
}

export function MobileProvider({
  children,
  swipeThreshold = 50,
  enableSwipeGestures = true,
}: MobileProviderProps) {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 768
  );
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);

  const deviceInfo: DeviceInfo = {
    type: getDeviceType(viewportWidth),
    isMobile: viewportWidth < BREAKPOINTS.tablet,
    isTablet: viewportWidth >= BREAKPOINTS.tablet && viewportWidth < BREAKPOINTS.desktop,
    isDesktop: viewportWidth >= BREAKPOINTS.desktop,
    isTouch: isTouchDevice(),
    orientation: getOrientation(viewportWidth, viewportHeight),
    viewportWidth,
    viewportHeight,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
      
      if (window.innerWidth >= BREAKPOINTS.desktop) {
        setMobileSidebarOpen(false);
      }
    };

    const handleOrientationChange = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const setMobileMenuOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeGestures) return;
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeStartY(touch.clientY);
  }, [enableSwipeGestures]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeGestures || swipeStartX === null || swipeStartY === null) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0 && !isMobileSidebarOpen) {
        setMobileSidebarOpen(true);
        setSwipeStartX(null);
        setSwipeStartY(null);
      } else if (deltaX < 0 && isMobileSidebarOpen) {
        setMobileSidebarOpen(false);
        setSwipeStartX(null);
        setSwipeStartY(null);
      }
    }
  }, [enableSwipeGestures, swipeStartX, swipeStartY, swipeThreshold, isMobileSidebarOpen]);

  const handleTouchEnd = useCallback(() => {
    setSwipeStartX(null);
    setSwipeStartY(null);
  }, []);

  const value: MobileContextValue = {
    ...deviceInfo,
    isOpen,
    setMobileMenuOpen,
    toggleMobileMenu,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
}

export interface MobileOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function MobileOnly({ children, fallback = null }: MobileOnlyProps) {
  const { isMobile } = useMobile();
  return isMobile ? <>{children}</> : <>{fallback}</>;
}

export interface TabletOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function TabletOnly({ children, fallback = null }: TabletOnlyProps) {
  const { isTablet } = useMobile();
  return isTablet ? <>{children}</> : <>{fallback}</>;
}

export interface DesktopOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function DesktopOnly({ children, fallback = null }: DesktopOnlyProps) {
  const { isDesktop } = useMobile();
  return isDesktop ? <>{children}</> : <>{fallback}</>;
}

export interface ResponsiveProps {
  children: ReactNode;
  renderDesktop?: ReactNode;
  renderTablet?: ReactNode;
  renderMobile?: ReactNode;
  showDesktop?: boolean;
  showTablet?: boolean;
  showMobile?: boolean;
}

export function Responsive({
  children,
  renderDesktop,
  renderTablet,
  renderMobile,
  showDesktop = true,
  showTablet = true,
  showMobile = true,
}: ResponsiveProps) {
  const { isDesktop, isTablet, isMobile } = useMobile();

  return (
    <>
      {showDesktop && isDesktop && (renderDesktop || children)}
      {showTablet && isTablet && (renderTablet || children)}
      {showMobile && isMobile && (renderMobile || children)}
    </>
  );
}

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: 'left' | 'right';
}

export function MobileNav({
  isOpen,
  onClose,
  children,
  position = 'left',
}: MobileNavProps) {
  if (typeof document === 'undefined') return null;

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          [position]: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '85vw',
          backgroundColor: 'var(--bg-primary)',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          overflow: 'auto',
          transform: isOpen ? 'translateX(0)' : position === 'left' ? 'translateX(-100%)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
        }}
      >
        {children}
      </div>
    </>
  );
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  title,
  height = '70vh',
}: MobileDrawerProps) {
  if (typeof document === 'undefined') return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 300ms ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--bg-primary)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          zIndex: 9999,
          maxHeight: height,
          overflow: 'auto',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: 'var(--text-disabled)',
              borderRadius: '2px',
            }}
          />
        </div>
        {title && (
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-default)',
              fontWeight: 600,
              fontSize: '16px',
            }}
          >
            {title}
          </div>
        )}
        <div style={{ padding: '16px 20px' }}>
          {children}
        </div>
      </div>
    </>
  );
}

export interface TouchRippleProps {
  color?: string;
  duration?: number;
}

export function TouchRipple({ color = 'rgba(0, 0, 0, 0.1)', duration = 400 }: TouchRippleProps) {
  const ripples = React.useState<Array<{ x: number; y: number; id: number }>>([])[0];
  const rippleId = React.useRef(0);

  const handleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: rippleId.current++ };
    ripples.push(newRipple);
    
    setTimeout(() => {
      const idx = ripples.findIndex(r => r.id === newRipple.id);
      if (idx >= 0) ripples.splice(idx, 1);
    }, duration);
  }, [color, duration]);

  return { onClick: handleClick };
}

export const MOBILE_BREAKPOINTS = BREAKPOINTS;

export const Mobile = {
  Provider: MobileProvider,
  MobileOnly,
  TabletOnly,
  DesktopOnly,
  Responsive,
  MobileNav,
  MobileDrawer,
  BREAKPOINTS: MOBILE_BREAKPOINTS,
};

export default MobileProvider;
