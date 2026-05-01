import React, { useState, ReactNode } from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
export type TooltipSize = 'sm' | 'md' | 'lg';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  size?: TooltipSize;
  isDisabled?: boolean;
  hasArrow?: boolean;
  delay?: number;
}

const Tooltip = ({
  content,
  children,
  placement = 'top',
  size = 'md',
  isDisabled = false,
  hasArrow = true,
  delay = 200,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (isDisabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const sizeStyles = {
    sm: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
    md: { padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
    lg: { padding: '0.75rem 1rem', fontSize: '1rem' },
  };

  const getPlacementStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 10000,
      whiteSpace: 'nowrap',
    };

    switch (placement) {
      case 'top':
        return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '0.5rem' };
      case 'bottom':
        return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '0.5rem' };
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '0.5rem' };
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '0.5rem' };
      default:
        return base;
    }
  };

  const getArrowStyles = (): React.CSSProperties => {
    const size = '6px';
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
    };

    switch (placement) {
      case 'top':
        return { ...base, borderLeft: `${size} solid transparent`, borderRight: `${size} solid transparent`, borderTop: `${size} solid #374151`, bottom: `-${size}`, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { ...base, borderLeft: `${size} solid transparent`, borderRight: `${size} solid transparent`, borderBottom: `${size} solid #374151`, top: `-${size}`, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...base, borderTop: `${size} solid transparent`, borderBottom: `${size} solid transparent`, borderLeft: `${size} solid #374151`, right: `-${size}`, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { ...base, borderTop: `${size} solid transparent`, borderBottom: `${size} solid transparent`, borderRight: `${size} solid #374151`, left: `-${size}`, top: '50%', transform: 'translateY(-50%)' };
      default:
        return base;
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          style={{
            ...getPlacementStyles(),
            backgroundColor: '#374151',
            color: '#ffffff',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            ...sizeStyles[size],
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {content}
          {hasArrow && <div style={getArrowStyles()} />}
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';

export { Tooltip };
