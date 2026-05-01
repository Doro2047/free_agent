import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

export type ColorMode = 'light' | 'dark' | 'system';
export type ResolvedColorMode = 'light' | 'dark';

export interface ColorModeContextValue {
  colorMode: ColorMode;
  resolvedColorMode: ResolvedColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  isDark: boolean;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error('useColorMode must be used within a ColorModeProvider');
  }
  return context;
}

export function useColorModeValue<T>(light: T, dark: T): T {
  const { isDark } = useColorMode();
  return isDark ? dark : light;
}

const COLOR_MODE_STORAGE_KEY = 'free-agent-color-mode';

function getSystemPreference(): ResolvedColorMode {
  if (typeof window === 'undefined') return 'light';
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return mediaQuery.matches ? 'dark' : 'light';
}

export interface ColorModeProviderProps {
  children: ReactNode;
  defaultMode?: ColorMode;
  storageKey?: string;
  persist?: boolean;
  onColorModeChange?: (mode: ResolvedColorMode) => void;
}

export function ColorModeProvider({
  children,
  defaultMode = 'system',
  storageKey = COLOR_MODE_STORAGE_KEY,
  persist = true,
  onColorModeChange,
}: ColorModeProviderProps) {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    if (!persist) return defaultMode;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ColorMode;
      }
    } catch {}
    return defaultMode;
  });

  const [resolvedColorMode, setResolvedColorMode] = useState<ResolvedColorMode>(() => {
    if (colorMode === 'system') {
      return getSystemPreference();
    }
    return colorMode;
  });

  const [isListeningToSystem, setIsListeningToSystem] = useState(false);

  useEffect(() => {
    if (colorMode === 'system') {
      setIsListeningToSystem(true);
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        const newMode = e.matches ? 'dark' : 'light';
        setResolvedColorMode(newMode);
        onColorModeChange?.(newMode);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      setResolvedColorMode(getSystemPreference());
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
        setIsListeningToSystem(false);
      };
    } else {
      setIsListeningToSystem(false);
      setResolvedColorMode(colorMode);
    }
  }, [colorMode, onColorModeChange]);

  useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (colorMode === 'system') {
      root.classList.add(resolvedColorMode);
    } else {
      root.classList.add(colorMode);
    }
    
    root.style.colorScheme = resolvedColorMode;
  }, [colorMode, resolvedColorMode]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    
    if (persist) {
      try {
        localStorage.setItem(storageKey, mode);
      } catch {}
    }
    
    const resolved = mode === 'system' ? getSystemPreference() : mode;
    onColorModeChange?.(resolved);
  }, [persist, storageKey, onColorModeChange]);

  const toggleColorMode = useCallback(() => {
    const nextMode: ColorMode = colorMode === 'light' 
      ? 'dark' 
      : colorMode === 'dark' 
        ? 'light' 
        : resolvedColorMode === 'light' 
          ? 'dark' 
          : 'light';
    setColorMode(nextMode);
  }, [colorMode, resolvedColorMode, setColorMode]);

  const value = useMemo(() => ({
    colorMode,
    resolvedColorMode,
    setColorMode,
    toggleColorMode,
    isDark: resolvedColorMode === 'dark',
  }), [colorMode, resolvedColorMode, setColorMode, toggleColorMode]);

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
}

export interface DarkModeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function DarkModeToggle({ size = 'md', showLabel = false }: DarkModeToggleProps) {
  const { colorMode, resolvedColorMode, toggleColorMode } = useColorMode();

  const sizeConfig = {
    sm: { button: '28px', icon: '16px', gap: '6px' },
    md: { button: '36px', icon: '20px', gap: '8px' },
    lg: { button: '44px', icon: '24px', gap: '10px' },
  };

  const config = sizeConfig[size];

  return (
    <button
      onClick={toggleColorMode}
      aria-label={`Switch to ${resolvedColorMode === 'light' ? 'dark' : 'light'} mode`}
      title={`Current: ${colorMode}${colorMode !== 'system' ? '' : ` (${resolvedColorMode})`}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: config.gap,
        padding: '6px 12px',
        height: config.button,
        borderRadius: '8px',
        border: '1px solid var(--border-default)',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        transition: 'all 150ms',
        color: 'var(--text-primary)',
      }}
    >
      {resolvedColorMode === 'dark' ? (
        <svg width={config.icon} height={config.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width={config.icon} height={config.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
      {showLabel && (
        <span style={{ fontSize: size === 'sm' ? '12px' : '14px' }}>
          {resolvedColorMode === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

export interface ColorModeSwitcherProps {
  size?: 'sm' | 'md' | 'lg';
}

export function ColorModeSwitcher({ size = 'md' }: ColorModeSwitcherProps) {
  const { colorMode, setColorMode, resolvedColorMode } = useColorMode();

  const sizeConfig = {
    sm: { button: '28px', fontSize: '10px' },
    md: { button: '36px', fontSize: '12px' },
    lg: { button: '44px', fontSize: '14px' },
  };

  const config = sizeConfig[size];

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {(['light', 'system', 'dark'] as ColorMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => setColorMode(mode)}
          aria-pressed={colorMode === mode}
          style={{
            height: config.button,
            padding: '0 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: colorMode === mode ? 'var(--bg-primary)' : 'transparent',
            color: colorMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: config.fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms',
            boxShadow: colorMode === mode ? 'var(--shadow-sm)' : 'none',
            textTransform: 'capitalize',
          }}
        >
          {mode === 'system' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Auto
            </span>
          ) : mode === 'light' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
              </svg>
              Light
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              Dark
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export interface ColorModeObserverProps {
  onChange?: (isDark: boolean) => void;
}

export function ColorModeObserver({ onChange }: ColorModeObserverProps) {
  const { isDark } = useColorMode();

  useEffect(() => {
    onChange?.(isDark);
  }, [isDark, onChange]);

  return null;
}

export const DARK_MODE_TRANSITION_CSS = `
  :root {
    transition: background-color 200ms ease, color 200ms ease;
  }
  
  @media (prefers-reduced-motion: reduce) {
    :root {
      transition: none;
    }
  }
`;

export function injectDarkModeStyles() {
  if (typeof document === 'undefined') return;
  
  const styleId = 'free-agent-dark-mode-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = DARK_MODE_TRANSITION_CSS;
  document.head.appendChild(style);
}

export function useDarkModeObserver(callback: (isDark: boolean) => void) {
  const { isDark } = useColorMode();
  
  useEffect(() => {
    callback(isDark);
  }, [isDark, callback]);
}

export const DarkMode = {
  Provider: ColorModeProvider,
  Toggle: DarkModeToggle,
  Switcher: ColorModeSwitcher,
  Observer: ColorModeObserver,
  useColorModeValue,
  injectStyles: injectDarkModeStyles,
};

export default ColorModeProvider;
