import React, { forwardRef, useState, ReactNode } from 'react';

export type InputSize = 'sm' | 'md' | 'lg' | 'xl';
export type InputVariant = 'outline' | 'filled' | 'flushed';
export type InputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'color';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: InputSize;
  variant?: InputVariant;
  type?: InputType;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  errorMessage?: string;
  helperText?: string;
  label?: string;
  placeholder?: string;
}

export interface InputGroupProps {
  children: ReactNode;
  size?: InputSize;
}

export interface InputLeftIconProps {
  children: ReactNode;
}

export interface InputRightIconProps {
  children: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'md',
  variant = 'outline',
  type = 'text',
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  isRequired = false,
  leftIcon,
  rightIcon,
  leftElement,
  rightElement,
  errorMessage,
  helperText,
  label,
  placeholder,
  className,
  style,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const sizeStyles: Record<InputSize, { height: string; fontSize: string; padding: string }> = {
    sm: { height: '2rem', fontSize: '0.875rem', padding: '0 0.5rem' },
    md: { height: '2.5rem', fontSize: '1rem', padding: '0 0.75rem' },
    lg: { height: '3rem', fontSize: '1.125rem', padding: '0 1rem' },
    xl: { height: '3.5rem', fontSize: '1.25rem', padding: '0 1.25rem' },
  };

  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: sizeStyles[size].height,
    fontSize: sizeStyles[size].fontSize,
    padding: leftIcon || leftElement
      ? `${sizeStyles[size].padding}`
      : rightIcon || rightElement
      ? `${sizeStyles[size].padding}`
      : sizeStyles[size].padding,
    paddingLeft: leftIcon || leftElement ? `calc(${sizeStyles[size].padding} + 2rem)` : sizeStyles[size].padding,
    paddingRight: rightIcon || rightElement ? `calc(${sizeStyles[size].padding} + 2rem)` : sizeStyles[size].padding,
    border: 'none',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  };

  const variantStyles: Record<InputVariant, React.CSSProperties> = {
    outline: {
      border: `2px solid ${isInvalid ? '#ef4444' : isFocused ? '#3b82f6' : '#e2e8f0'}`,
      borderRadius: '0.375rem',
      backgroundColor: 'transparent',
    },
    filled: {
      border: `2px solid ${isInvalid ? '#ef4444' : isFocused ? '#3b82f6' : 'transparent'}`,
      borderRadius: '0.375rem',
      backgroundColor: isFocused ? '#ffffff' : '#f1f5f9',
    },
    flushed: {
      border: 'none',
      borderBottom: `2px solid ${isInvalid ? '#ef4444' : isFocused ? '#3b82f6' : '#e2e8f0'}`,
      borderRadius: '0',
      backgroundColor: 'transparent',
    },
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: isInvalid ? '#ef4444' : '#374151',
          }}
        >
          {label}
          {isRequired && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {leftIcon}
          </div>
        )}

        {leftElement && (
          <div
            style={{
              position: 'absolute',
              left: '0',
              top: '0',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '0.75rem',
              backgroundColor: '#f1f5f9',
              borderRight: '1px solid #e2e8f0',
              borderRadius: '0.375rem 0 0 0.375rem',
            }}
          >
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          disabled={isDisabled}
          readOnly={isReadOnly}
          required={isRequired}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            ...baseStyles,
            ...variantStyles[variant],
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? 'not-allowed' : 'text',
            ...style,
          }}
          aria-invalid={isInvalid}
          aria-describedby={errorMessage ? `${props.id || 'input'}-error` : helperText ? `${props.id || 'input'}-helper` : undefined}
          {...props}
        />

        {rightIcon && (
          <div
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightIcon}
          </div>
        )}

        {rightElement && (
          <div
            style={{
              position: 'absolute',
              right: '0',
              top: '0',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              paddingRight: '0.75rem',
              backgroundColor: '#f1f5f9',
              borderLeft: '1px solid #e2e8f0',
              borderRadius: '0 0.375rem 0.375rem 0',
            }}
          >
            {rightElement}
          </div>
        )}
      </div>

      {errorMessage && (
        <p
          id={`${props.id || 'input'}-error`}
          style={{
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#ef4444',
          }}
        >
          {errorMessage}
        </p>
      )}

      {helperText && !errorMessage && (
        <p
          id={`${props.id || 'input'}-helper`}
          style={{
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
