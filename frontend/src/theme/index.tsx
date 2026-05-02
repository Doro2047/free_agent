import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  secondaryHover: string;
  background: string;
  backgroundElevated: string;
  backgroundMuted: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  border: string;
  borderHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  success: string;
  successHover: string;
  warning: string;
  warningHover: string;
  error: string;
  errorHover: string;
  info: string;
  infoHover: string;
}

export interface Theme {
  mode: ColorScheme;
  colors: ThemeColors;
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    8: string;
    10: string;
    12: string;
    16: string;
    20: string;
    24: string;
    32: string;
    40: string;
    48: string;
    56: string;
    64: string;
  };
  borderRadius: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  shadow: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  transitions: {
    fast: string;
    base: string;
    slow: string;
  };
  zIndex: {
    dropdown: number;
    sticky: number;
    fixed: number;
    modalBackdrop: number;
    modal: number;
    popover: number;
    tooltip: number;
  };
}

export interface ThemePreset {
  name: string;
  mode: ColorScheme;
  colors: Partial<ThemeColors>;
}

export const lightColors: ThemeColors = {
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryActive: '#1d4ed8',
  secondary: '#64748b',
  secondaryHover: '#475569',
  background: '#ffffff',
  backgroundElevated: '#f8fafc',
  backgroundMuted: '#f1f5f9',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',
  surfaceActive: '#e2e8f0',
  border: '#e2e8f0',
  borderHover: '#cbd5e1',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textDisabled: '#cbd5e1',
  success: '#22c55e',
  successHover: '#16a34a',
  warning: '#f59e0b',
  warningHover: '#d97706',
  error: '#ef4444',
  errorHover: '#dc2626',
  info: '#3b82f6',
  infoHover: '#2563eb',
};

export const darkColors: ThemeColors = {
  primary: '#60a5fa',
  primaryHover: '#3b82f6',
  primaryActive: '#2563eb',
  secondary: '#94a3b8',
  secondaryHover: '#cbd5e1',
  background: '#0f172a',
  backgroundElevated: '#1e293b',
  backgroundMuted: '#1e293b',
  surface: '#1e293b',
  surfaceHover: '#334155',
  surfaceActive: '#475569',
  border: '#334155',
  borderHover: '#475569',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textDisabled: '#64748b',
  success: '#4ade80',
  successHover: '#22c55e',
  warning: '#fbbf24',
  warningHover: '#f59e0b',
  error: '#f87171',
  errorHover: '#ef4444',
  info: '#60a5fa',
  infoHover: '#3b82f6',
};

export const themes: Record<string, Theme> = {
  light: {
    mode: 'light',
    colors: lightColors,
    typography: {
      fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.625,
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    spacing: {
      0: '0',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      8: '2rem',
      10: '2.5rem',
      12: '3rem',
      16: '4rem',
      20: '5rem',
      24: '6rem',
      32: '8rem',
      40: '10rem',
      48: '12rem',
      56: '14rem',
      64: '16rem',
    },
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      base: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      full: '9999px',
    },
    shadow: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    },
    transitions: {
      fast: '100ms ease-in-out',
      base: '150ms ease-in-out',
      slow: '300ms ease-in-out',
    },
    zIndex: {
      dropdown: 1000,
      sticky: 1020,
      fixed: 1030,
      modalBackdrop: 1040,
      modal: 1050,
      popover: 1060,
      tooltip: 1070,
    },
  },
  dark: {
    mode: 'dark',
    colors: darkColors,
    typography: {
      fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.625,
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    spacing: {
      0: '0',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      8: '2rem',
      10: '2.5rem',
      12: '3rem',
      16: '4rem',
      20: '5rem',
      24: '6rem',
      32: '8rem',
      40: '10rem',
      48: '12rem',
      56: '14rem',
      64: '16rem',
    },
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      base: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      full: '9999px',
    },
    shadow: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.6)',
    },
    transitions: {
      fast: '100ms ease-in-out',
      base: '150ms ease-in-out',
      slow: '300ms ease-in-out',
    },
    zIndex: {
      dropdown: 1000,
      sticky: 1020,
      fixed: 1030,
      modalBackdrop: 1040,
      modal: 1050,
      popover: 1060,
      tooltip: 1070,
    },
  },
};

export class ThemeManager {
  private currentTheme: Theme;
  private listeners: Set<(theme: Theme) => void> = new Set();
  private mode: ThemeMode = 'system';

  constructor(mode: ThemeMode = 'system') {
    this.mode = mode;
    this.currentTheme = this.getThemeFromMode(this.getEffectiveMode());
    this.setupSystemListener();
  }

  private getEffectiveMode(): ColorScheme {
    if (this.mode === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return this.mode;
  }

  private setupSystemListener(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = () => {
      if (this.mode === 'system') {
        this.setTheme(this.getThemeFromMode(this.getEffectiveMode()));
      }
    };

    mediaQuery.addEventListener('change', handler);
  }

  private getThemeFromMode(mode: ColorScheme): Theme {
    return themes[mode] || themes.light;
  }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', mode);
    }

    const effectiveMode = this.getEffectiveMode();
    this.setTheme(this.getThemeFromMode(effectiveMode));
  }

  getMode(): ThemeMode {
    return this.mode;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme.mode);
      this.applyThemeToCSSVariables(theme);
    }

    this.notifyListeners();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  private applyThemeToCSSVariables(theme: Theme): void {
    const root = document.documentElement;

    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-primary-hover', theme.colors.primaryHover);
    root.style.setProperty('--color-primary-active', theme.colors.primaryActive);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-background-elevated', theme.colors.backgroundElevated);
    root.style.setProperty('--color-background-muted', theme.colors.backgroundMuted);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-surface-hover', theme.colors.surfaceHover);
    root.style.setProperty('--color-surface-active', theme.colors.surfaceActive);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-border-hover', theme.colors.borderHover);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-text-disabled', theme.colors.textDisabled);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);
    root.style.setProperty('--color-info', theme.colors.info);

    root.style.setProperty('--font-family-sans', theme.typography.fontFamily.sans);
    root.style.setProperty('--font-family-mono', theme.typography.fontFamily.mono);

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    Object.entries(theme.shadow).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
  }

  createCustomTheme(preset: ThemePreset): Theme {
    const baseTheme = themes[preset.mode];
    
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        ...preset.colors,
      },
    };
  }

  addCustomTheme(name: string, preset: ThemePreset): void {
    themes[name] = this.createCustomTheme(preset);
  }

  removeCustomTheme(name: string): boolean {
    if (name in themes) {
      delete themes[name];
      return true;
    }
    return false;
  }

  onChange(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTheme);
      } catch (error) {
        console.error('Error in theme listener:', error);
      }
    });
  }

  static loadSavedMode(): ThemeMode {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode');
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved as ThemeMode;
      }
    }
    return 'system';
  }
}

export const themeManager = new ThemeManager(ThemeManager.loadSavedMode());

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  effectiveMode: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  createTheme: (preset: ThemePreset) => Theme;
  addCustomTheme: (name: string, preset: ThemePreset) => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.light,
  mode: 'system',
  effectiveMode: 'light',
  setMode: () => {},
  createTheme: () => themes.light,
  addCustomTheme: () => {},
  isDark: false,
});

export function useTheme(): ThemeContextValue {
  const [mode, setModeState] = useState<ThemeMode>(themeManager.getMode());
  const [theme, setTheme] = useState<Theme>(themeManager.getTheme());

  useEffect(() => {
    const unsubscribe = themeManager.onChange(setTheme);
    return unsubscribe;
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    themeManager.setMode(newMode);
    setModeState(newMode);
  }, []);

  const createTheme = useCallback((preset: ThemePreset) => {
    return themeManager.createCustomTheme(preset);
  }, []);

  const addCustomTheme = useCallback((name: string, preset: ThemePreset) => {
    themeManager.addCustomTheme(name, preset);
  }, []);

  const effectiveMode = useMemo(() => {
    return mode === 'system' 
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
  }, [mode]);

  return {
    theme,
    mode,
    effectiveMode,
    setMode,
    createTheme,
    addCustomTheme,
    isDark: effectiveMode === 'dark',
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeValue = useTheme();

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColorScheme(): ColorScheme {
  const { effectiveMode } = useTheme();
  return effectiveMode;
}

export function useIsDark(): boolean {
  const { isDark } = useTheme();
  return isDark;
}

export function createColorPalette(baseColor: string): Record<string, string> {
  const hsl = hexToHSL(baseColor);
  
  return {
    50: hslToHex(hsl.h, hsl.s, 95),
    100: hslToHex(hsl.h, hsl.s, 90),
    200: hslToHex(hsl.h, hsl.s, 80),
    300: hslToHex(hsl.h, hsl.s, 70),
    400: hslToHex(hsl.h, hsl.s, 60),
    500: baseColor,
    600: hslToHex(hsl.h, hsl.s, 50),
    700: hslToHex(hsl.h, hsl.s, 40),
    800: hslToHex(hsl.h, hsl.s, 30),
    900: hslToHex(hsl.h, hsl.s, 20),
  };
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  if (!result) {
    return { h: 0, s: 0, l: 0 };
  }

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getContrastColor(hexColor: string): string {
  const { r, g, b } = hexToRGB(hexColor);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
