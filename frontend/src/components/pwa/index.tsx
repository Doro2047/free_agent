import React, { useEffect, useState, useCallback } from 'react';

export interface PWAInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly nativeEvent: Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
  };
}

export interface PWAState {
  isOnline: boolean;
  isOfflineReady: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  canInstall: boolean;
  installPrompt: PWAInstallPromptEvent | null;
}

export interface PWAContextValue extends PWAState {
  install: () => Promise<void>;
  dismissInstall: () => void;
  refreshApp: () => void;
  updateServiceWorker: () => void;
}

const PWAContext = React.createContext<PWAContextValue | null>(null);

export function usePWA() {
  const context = React.useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
}

export interface PWAProviderProps {
  children: React.ReactNode;
  onInstall?: () => void;
  onUpdate?: () => void;
  autoCheckUpdate?: boolean;
  checkInterval?: number;
}

export function PWAProvider({
  children,
  onInstall,
  onUpdate,
  autoCheckUpdate = true,
  checkInterval = 60000,
}: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as PWAInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      setIsUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !autoCheckUpdate) return;

    const checkForUpdates = () => {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('update' in registration) {
            registration.update();
          }
        });
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, checkInterval);

    return () => clearInterval(interval);
  }, [autoCheckUpdate, checkInterval]);

  const install = useCallback(async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.nativeEvent.prompt();
      onInstall?.();
    } catch (error) {
      console.error('Install prompt failed:', error);
    }

    const { outcome } = await installPrompt.nativeEvent.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setInstallPrompt(null);
    setCanInstall(false);
  }, [installPrompt, onInstall]);

  const dismissInstall = useCallback(() => {
    setCanInstall(false);
    setInstallPrompt(null);
  }, []);

  const refreshApp = useCallback(() => {
    window.location.reload();
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if ('update' in registration) {
          registration.update().then(() => {
            setIsUpdateAvailable(false);
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        setIsOfflineReady(true);
      } else {
        window.addEventListener('load', () => {
          setIsOfflineReady(true);
        });
      }
    }
  }, []);

  const value: PWAContextValue = {
    isOnline,
    isOfflineReady,
    isInstalled,
    isUpdateAvailable,
    canInstall,
    installPrompt,
    install,
    dismissInstall,
    refreshApp,
    updateServiceWorker,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
}

export interface InstallPWAButtonProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function InstallPWAButton({ children, className, style }: InstallPWAButtonProps) {
  const { canInstall, install } = usePWA();

  if (!canInstall) return null;

  return (
    <button onClick={install} className={className} style={style}>
      {children || 'Install App'}
    </button>
  );
}

export interface UpdatePWAButtonProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function UpdatePWAButton({ children, className, style }: UpdatePWAButtonProps) {
  const { isUpdateAvailable, updateServiceWorker, refreshApp } = usePWA();

  if (!isUpdateAvailable) return null;

  return (
    <button
      onClick={() => {
        updateServiceWorker();
        refreshApp();
      }}
      className={className}
      style={style}
    >
      {children || 'Update Available - Click to Refresh'}
    </button>
  );
}

export interface OfflineIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
}

export function OfflineIndicator({ className, style }: OfflineIndicatorProps) {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '8px 16px',
        backgroundColor: '#f59e0b',
        color: 'white',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        zIndex: 9999,
        ...style,
      }}
    >
      You are currently offline. Some features may be limited.
    </div>
  );
}

export interface PWABannerProps {
  className?: string;
  style?: React.CSSProperties;
}

export function PWABanner({ className, style }: PWABannerProps) {
  const { canInstall, install, dismissInstall } = usePWA();

  if (!canInstall) return null;

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '16px 24px',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 9999,
        maxWidth: '90vw',
        ...style,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Install Free Agent</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Add to your home screen for a better experience
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={install}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--brand-500)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Install
        </button>
        <button
          onClick={dismissInstall}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Not Now
        </button>
      </div>
    </div>
  );
}

export const PWA = {
  Provider: PWAProvider,
  InstallButton: InstallPWAButton,
  UpdateButton: UpdatePWAButton,
  OfflineIndicator,
  PWABanner,
};

export default PWAProvider;
