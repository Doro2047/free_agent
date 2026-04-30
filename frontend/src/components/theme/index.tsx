import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface ThemeColors {
  primary: ColorPalette;
  secondary: ColorPalette;
  accent: ColorPalette;
  success: ColorPalette;
  warning: ColorPalette;
  error: ColorPalette;
  info: ColorPalette;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ThemeRadii {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeTypography {
  fontFamily: {
    sans: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      inverse: string;
    };
    border: {
      default: string;
      focus: string;
    };
    brand: ThemeColors;
  };
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  typography: ThemeTypography;
}

export interface CustomThemeOverrides {
  colors?: Partial<ThemeConfig['colors']>;
  spacing?: Partial<ThemeSpacing>;
  radii?: Partial<ThemeRadii>;
  shadows?: Partial<ThemeShadows>;
  typography?: Partial<ThemeTypography>;
}

const lightTheme: ThemeConfig = {
  id: 'light',
  name: 'Light',
  isDark: false,
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#9ca3af',
      inverse: '#ffffff',
    },
    border: {
      default: '#e5e7eb',
      focus: '#3b82f6',
    },
    brand: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      secondary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
      },
      accent: {
        50: '#ecfdf5',
        100: '#d1fae5',
        200: '#a7f3d0',
        300: '#6ee7b7',
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b',
      },
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      },
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
      },
      error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      info: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
      },
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
};

const darkTheme: ThemeConfig = {
  ...lightTheme,
  id: 'dark',
  name: 'Dark',
  isDark: true,
  colors: {
    ...lightTheme.colors,
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      disabled: '#64748b',
      inverse: '#0f172a',
    },
    border: {
      default: '#334155',
      focus: '#60a5fa',
    },
  },
};

const PRESET_THEMES: ThemeConfig[] = [
  lightTheme,
  darkTheme,
  {
    ...lightTheme,
    id: 'ocean',
    name: 'Ocean',
    colors: {
      ...lightTheme.colors,
      brand: {
        ...lightTheme.colors.brand,
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  {
    ...lightTheme,
    id: 'forest',
    name: 'Forest',
    colors: {
      ...lightTheme.colors,
      brand: {
        ...lightTheme.colors.brand,
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
    },
  },
  {
    ...lightTheme,
    id: 'sunset',
    name: 'Sunset',
    colors: {
      ...lightTheme.colors,
      brand: {
        ...lightTheme.colors.brand,
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
    },
  },
  {
    ...lightTheme,
    id: 'berry',
    name: 'Berry',
    colors: {
      ...lightTheme.colors,
      brand: {
        ...lightTheme.colors.brand,
        primary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
    },
  },
];

export interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (themeId: string) => void;
  customThemes: ThemeConfig[];
  registerTheme: (theme: ThemeConfig) => void;
  unregisterTheme: (themeId: string) => void;
  updateTheme: (themeId: string, overrides: CustomThemeOverrides) => void;
  resetTheme: (themeId: string) => void;
  presetThemes: ThemeConfig[];
  colors: ThemeConfig['colors'];
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  typography: ThemeTypography;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

const THEME_STORAGE_KEY = 'free-agent-theme';

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...PRESET_THEMES.find(t => t.id === parsed) || lightTheme };
      }
    } catch {}
    return lightTheme;
  });

  const [customThemes, setCustomThemes] = useState<ThemeConfig[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.colors.background.primary);
    root.style.setProperty('--bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--bg-tertiary', theme.colors.background.tertiary);
    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--text-disabled', theme.colors.text.disabled);
    root.style.setProperty('--text-inverse', theme.colors.text.inverse);
    root.style.setProperty('--border-default', theme.colors.border.default);
    root.style.setProperty('--border-focus', theme.colors.border.focus);
    root.style.setProperty('--brand-50', theme.colors.brand.primary[50]);
    root.style.setProperty('--brand-100', theme.colors.brand.primary[100]);
    root.style.setProperty('--brand-200', theme.colors.brand.primary[200]);
    root.style.setProperty('--brand-300', theme.colors.brand.primary[300]);
    root.style.setProperty('--brand-400', theme.colors.brand.primary[400]);
    root.style.setProperty('--brand-500', theme.colors.brand.primary[500]);
    root.style.setProperty('--brand-600', theme.colors.brand.primary[600]);
    root.style.setProperty('--brand-700', theme.colors.brand.primary[700]);
    root.style.setProperty('--brand-800', theme.colors.brand.primary[800]);
    root.style.setProperty('--brand-900', theme.colors.brand.primary[900]);
    
    root.dataset.theme = theme.id;
    
    document.body.classList.toggle('dark', theme.isDark);
  }, [theme]);

  const setTheme = useCallback((themeId: string) => {
    const found = [...PRESET_THEMES, ...customThemes].find(t => t.id === themeId);
    if (found) {
      setThemeState(found);
      try {
        localStorage.setItem(storageKey, JSON.stringify(themeId));
      } catch {}
    }
  }, [customThemes, storageKey]);

  const registerTheme = useCallback((newTheme: ThemeConfig) => {
    setCustomThemes(prev => {
      const existing = prev.findIndex(t => t.id === newTheme.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newTheme;
        return updated;
      }
      return [...prev, newTheme];
    });
  }, []);

  const unregisterTheme = useCallback((themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
  }, []);

  const updateTheme = useCallback((themeId: string, overrides: CustomThemeOverrides) => {
    setCustomThemes(prev => {
      const existing = prev.find(t => t.id === themeId);
      if (existing) {
        return prev.map(t => {
          if (t.id === themeId) {
            return {
              ...t,
              colors: { ...t.colors, ...overrides.colors },
              spacing: { ...t.spacing, ...overrides.spacing },
              radii: { ...t.radii, ...overrides.radii },
              shadows: { ...t.shadows, ...overrides.shadows },
              typography: { ...t.typography, ...overrides.typography },
            };
          }
          return t;
        });
      }
      return prev;
    });
  }, []);

  const resetTheme = useCallback((themeId: string) => {
    const preset = PRESET_THEMES.find(t => t.id === themeId);
    if (preset) {
      setThemeState(preset);
    }
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
  }, []);

  const allThemes = [...PRESET_THEMES, ...customThemes];

  const value: ThemeContextValue = {
    theme,
    setTheme,
    customThemes,
    registerTheme,
    unregisterTheme,
    updateTheme,
    resetTheme,
    presetThemes: PRESET_THEMES,
    colors: theme.colors,
    spacing: theme.spacing,
    radii: theme.radii,
    shadows: theme.shadows,
    typography: theme.typography,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export interface ThemePreviewProps {
  theme: ThemeConfig;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ThemePreview({ theme, isSelected, onClick }: ThemePreviewProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '120px',
        padding: '8px',
        border: isSelected ? '2px solid var(--brand-500)' : '2px solid transparent',
        borderRadius: theme.radii.lg,
        backgroundColor: theme.colors.background.primary,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      <div
        style={{
          height: '60px',
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.background.secondary,
          marginBottom: '8px',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px',
          gap: '4px',
        }}
      >
        <div
          style={{
            height: '8px',
            width: '60%',
            backgroundColor: theme.colors.brand.primary[500],
            borderRadius: theme.radii.sm,
          }}
        />
        <div
          style={{
            height: '8px',
            width: '80%',
            backgroundColor: theme.colors.text.secondary,
            borderRadius: theme.radii.sm,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            height: '8px',
            width: '40%',
            backgroundColor: theme.colors.text.secondary,
            borderRadius: theme.radii.sm,
            opacity: 0.3,
          }}
        />
      </div>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: theme.colors.text.primary,
          textAlign: 'center',
        }}
      >
        {theme.name}
      </div>
    </button>
  );
}

export interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeCustomizer({ isOpen, onClose }: ThemeCustomizerProps) {
  const { theme, setTheme, presetThemes, customThemes, registerTheme } = useTheme();

  if (!isOpen) return null;

  const allThemes = [...presetThemes, ...customThemes];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Customize Theme</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#9ca3af',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#6b7280' }}>
            Preset Themes
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {presetThemes.map((t) => (
              <ThemePreview
                key={t.id}
                theme={t}
                isSelected={theme.id === t.id}
                onClick={() => setTheme(t.id)}
              />
            ))}
          </div>
        </div>

        {customThemes.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#6b7280' }}>
              Custom Themes
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {customThemes.map((t) => (
                <ThemePreview
                  key={t.id}
                  theme={t}
                  isSelected={theme.id === t.id}
                  onClick={() => setTheme(t.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { PRESET_THEMES, lightTheme, darkTheme };
export default ThemeProvider;
