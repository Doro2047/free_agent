import React, { forwardRef, useState, useRef, useEffect, useCallback, ReactNode, MouseEvent, KeyboardEvent } from 'react';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';
export type ButtonColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  isLoading?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loadingText?: string;
  spinner?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'solid',
  size = 'md',
  color = 'primary',
  isLoading = false,
  isDisabled = false,
  isFullWidth = false,
  leftIcon,
  rightIcon,
  loadingText,
  spinner,
  children,
  className,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    xs: { padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '1.5rem' },
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem', height: '2rem' },
    md: { padding: '0.5rem 1rem', fontSize: '1rem', height: '2.5rem' },
    lg: { padding: '0.625rem 1.25rem', fontSize: '1.125rem', height: '3rem' },
    xl: { padding: '0.75rem 1.5rem', fontSize: '1.25rem', height: '3.5rem' },
    icon: { padding: '0.5rem', fontSize: '1rem', height: '2rem', width: '2rem' },
  };

  const colorStyles: Record<ButtonColor, { bg: string; bgHover: string; bgActive: string; text: string; border?: string }> = {
    primary: { bg: '#3b82f6', bgHover: '#2563eb', bgActive: '#1d4ed8', text: '#ffffff' },
    secondary: { bg: '#64748b', bgHover: '#475569', bgActive: '#334155', text: '#ffffff' },
    success: { bg: '#22c55e', bgHover: '#16a34a', bgActive: '#15803d', text: '#ffffff' },
    warning: { bg: '#f59e0b', bgHover: '#d97706', bgActive: '#b45309', text: '#ffffff' },
    error: { bg: '#ef4444', bgHover: '#dc2626', bgActive: '#b91c1c', text: '#ffffff' },
    info: { bg: '#06b6d4', bgHover: '#0891b2', bgActive: '#0e7490', text: '#ffffff' },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    solid: {
      backgroundColor: colorStyles[color].bg,
      color: colorStyles[color].text,
      border: 'none',
    },
    outline: {
      backgroundColor: 'transparent',
      color: colorStyles[color].bg,
      border: `2px solid ${colorStyles[color].bg}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colorStyles[color].bg,
      border: 'none',
    },
    link: {
      backgroundColor: 'transparent',
      color: colorStyles[color].bg,
      border: 'none',
      textDecoration: 'underline',
      padding: '0',
      height: 'auto',
    },
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 500,
    borderRadius: '0.375rem',
    cursor: isDisabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    outline: 'none',
    width: isFullWidth ? '100%' : 'auto',
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  const getHoverStyles = (): React.CSSProperties => {
    if (isDisabled || isLoading) return {};

    if (variant === 'solid') {
      return { backgroundColor: colorStyles[color].bgHover };
    } else if (variant === 'outline' || variant === 'ghost') {
      return { backgroundColor: `${colorStyles[color].bg}10` };
    }
    return {};
  };

  const getActiveStyles = (): React.CSSProperties => {
    if (isDisabled || isLoading) return {};

    if (variant === 'solid') {
      return { backgroundColor: colorStyles[color].bgActive, transform: 'scale(0.98)' };
    } else if (variant === 'outline' || variant === 'ghost') {
      return { backgroundColor: `${colorStyles[color].bg}20` };
    }
    return {};
  };

  const getFocusStyles = (): React.CSSProperties => {
    if (isDisabled) return {};
    return {
      boxShadow: `0 0 0 3px ${colorStyles[color].bg}40`,
    };
  };

  return (
    <button
      ref={ref}
      disabled={isDisabled || isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        ...baseStyles,
        ...(isHovered && !isPressed ? getHoverStyles() : {}),
        ...(isPressed ? getActiveStyles() : {}),
        ...(isFocused ? getFocusStyles() : {}),
      }}
      {...props}
    >
      {isLoading ? (
        <>
          {spinner || (
            <svg
              width={sizeStyles[size].height}
              height={sizeStyles[size].height}
              viewBox="0 0 24 24"
              fill="none"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="31.416"
                strokeDashoffset="10"
              />
            </svg>
          )}
          {loadingText || children}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
