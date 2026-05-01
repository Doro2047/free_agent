import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useI18n, Locale, SUPPORTED_LOCALES } from '../../i18n';

const TARGET_LOCALES: Locale[] = ['en', 'zh-CN', 'ja', 'ko'];

export interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'button-group' | 'select';
  size?: 'sm' | 'md' | 'lg';
  showNativeName?: boolean;
  showFlag?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LanguageSwitcher({
  variant = 'dropdown',
  size = 'md',
  showNativeName = true,
  showFlag = true,
  className,
  style,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  }, [setLocale]);

  const currentLocale = SUPPORTED_LOCALES[locale];
  const sizeStyles = {
    sm: { height: '28px', fontSize: '12px', padding: '4px 8px', gap: '4px' },
    md: { height: '36px', fontSize: '14px', padding: '8px 12px', gap: '8px' },
    lg: { height: '44px', fontSize: '16px', padding: '10px 16px', gap: '10px' },
  };

  const currentStyles = sizeStyles[size];

  if (variant === 'button-group') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          gap: '2px',
          padding: '4px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          ...style,
        }}
      >
        {TARGET_LOCALES.map((loc) => {
          const isActive = locale === loc;
          const config = SUPPORTED_LOCALES[loc];
          
          return (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              title={config.name}
              style={{
                height: currentStyles.height,
                padding: currentStyles.padding,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: currentStyles.fontSize,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 150ms',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {showFlag && <FlagIcon locale={loc} size={size} />}
              {showNativeName && (
                <span style={{ marginLeft: showFlag ? '4px' : 0 }}>
                  {config.nativeName}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'select') {
    return (
      <select
        value={locale}
        onChange={(e) => handleLocaleChange(e.target.value as Locale)}
        className={className}
        style={{
          height: currentStyles.height,
          padding: currentStyles.padding,
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: currentStyles.fontSize,
          cursor: 'pointer',
          ...style,
        }}
      >
        {TARGET_LOCALES.map((loc) => {
          const config = SUPPORTED_LOCALES[loc];
          return (
            <option key={loc} value={loc}>
              {showFlag ? `${getFlagEmoji(loc)} ` : ''}{showNativeName ? config.nativeName : config.name}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <div ref={dropdownRef} className={className} style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: currentStyles.gap,
          height: currentStyles.height,
          padding: currentStyles.padding,
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: currentStyles.fontSize,
          cursor: 'pointer',
          transition: 'all 150ms',
        }}
      >
        {showFlag && <FlagIcon locale={locale} size={size} />}
        <span>{showNativeName ? currentLocale.nativeName : currentLocale.name}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            marginLeft: '4px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {TARGET_LOCALES.map((loc) => {
            const isActive = locale === loc;
            const config = SUPPORTED_LOCALES[loc];
            
            return (
              <button
                key={loc}
                onClick={() => handleLocaleChange(loc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--bg-secondary)' : 'transparent',
                  color: isActive ? 'var(--brand-500)' : 'var(--text-primary)',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {showFlag && <FlagIcon locale={loc} size="md" />}
                <span style={{ flex: 1 }}>{config.nativeName}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {config.name}
                </span>
                {isActive && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FlagIconProps {
  locale: Locale;
  size?: 'sm' | 'md' | 'lg';
}

function FlagIcon({ locale, size = 'md' }: FlagIconProps) {
  const emoji = getFlagEmoji(locale);
  const fontSize = size === 'sm' ? '14px' : size === 'md' ? '18px' : '22px';
  
  return (
    <span style={{ fontSize, lineHeight: 1 }} role="img" aria-label={locale}>
      {emoji}
    </span>
  );
}

function getFlagEmoji(locale: Locale): string {
  const flags: Record<Locale, string> = {
    en: '🇺🇸',
    'zh-CN': '🇨🇳',
    'zh-TW': '🇹🇼',
    ja: '🇯🇵',
    ko: '🇰🇷',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    ru: '🇷🇺',
    ar: '🇸🇦',
  };
  return flags[locale] || '🌐';
}

export interface LanguageDetectorProps {
  onLocaleDetected?: (locale: Locale) => void;
  fallbackLocale?: Locale;
}

export function LanguageDetector({ onLocaleDetected, fallbackLocale = 'en' }: LanguageDetectorProps) {
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const detectLocale = (): Locale => {
      const browserLang = navigator.language;
      
      if (browserLang.startsWith('zh')) return 'zh-CN';
      if (browserLang.startsWith('ja')) return 'ja';
      if (browserLang.startsWith('ko')) return 'ko';
      if (browserLang.startsWith('en')) return 'en';
      
      return fallbackLocale;
    };

    const detectedLocale = detectLocale();
    
    if (detectedLocale !== locale) {
      setLocale(detectedLocale);
    }
    
    onLocaleDetected?.(detectedLocale);
  }, []);

  return null;
}

export default LanguageSwitcher;
