import React, { ReactNode } from 'react';

export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: () => void;
  isRemovable?: boolean;
  onRemove?: () => void;
}

const Badge = ({
  children,
  variant = 'subtle',
  color = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  onClick,
  isRemovable = false,
  onRemove,
}: BadgeProps) => {
  const colorSchemes: Record<BadgeColor, { solid: { bg: string; text: string }; subtle: { bg: string; text: string }; outline: { bg: string; text: string } }> = {
    primary: { solid: { bg: '#3b82f6', text: '#ffffff' }, subtle: { bg: '#dbeafe', text: '#1e40af' }, outline: { bg: 'transparent', text: '#3b82f6', border: '#3b82f6' } },
    secondary: { solid: { bg: '#64748b', text: '#ffffff' }, subtle: { bg: '#e2e8f0', text: '#475569' }, outline: { bg: 'transparent', text: '#64748b', border: '#64748b' } },
    success: { solid: { bg: '#22c55e', text: '#ffffff' }, subtle: { bg: '#dcfce7', text: '#15803d' }, outline: { bg: 'transparent', text: '#22c55e', border: '#22c55e' } },
    warning: { solid: { bg: '#f59e0b', text: '#ffffff' }, subtle: { bg: '#fef3c7', text: '#b45309' }, outline: { bg: 'transparent', text: '#f59e0b', border: '#f59e0b' } },
    error: { solid: { bg: '#ef4444', text: '#ffffff' }, subtle: { bg: '#fee2e2', text: '#b91c1c' }, outline: { bg: 'transparent', text: '#ef4444', border: '#ef4444' } },
    info: { solid: { bg: '#06b6d4', text: '#ffffff' }, subtle: { bg: '#cffafe', text: '#0e7490' }, outline: { bg: 'transparent', text: '#06b6d4', border: '#06b6d4' } },
    gray: { solid: { bg: '#6b7280', text: '#ffffff' }, subtle: { bg: '#f3f4f6', text: '#374151' }, outline: { bg: 'transparent', text: '#6b7280', border: '#6b7280' } },
  };

  const sizeStyles = {
    sm: { fontSize: '0.75rem', padding: '0.125rem 0.5rem', gap: '0.25rem' },
    md: { fontSize: '0.875rem', padding: '0.25rem 0.75rem', gap: '0.375rem' },
    lg: { fontSize: '1rem', padding: '0.375rem 1rem', gap: '0.5rem' },
  };

  const scheme = colorSchemes[color][variant];

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: sizeStyles[size].fontSize,
        padding: sizeStyles[size].padding,
        gap: sizeStyles[size].gap,
        fontWeight: 500,
        borderRadius: '9999px',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: scheme.bg,
        color: scheme.text,
        border: variant === 'outline' ? `1px solid ${scheme.border}` : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {leftIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>}
      {children}
      {rightIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>}
      {isRemovable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            marginLeft: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            color: 'inherit',
            opacity: 0.7,
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
};

Badge.displayName = 'Badge';

export { Badge };
