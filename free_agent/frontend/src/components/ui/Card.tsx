import React, { ReactNode } from 'react';

export type CardVariant = 'outline' | 'filled' | 'elevated';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  isPadded?: boolean;
  isHoverable?: boolean;
  onClick?: () => void;
}

export interface CardHeaderProps {
  children: ReactNode;
  actions?: ReactNode;
}

export interface CardBodyProps {
  children: ReactNode;
}

export interface CardFooterProps {
  children: ReactNode;
  divider?: boolean;
}

const Card = ({
  children,
  variant = 'outline',
  size = 'md',
  isPadded = true,
  isHoverable = false,
  onClick,
}: CardProps) => {
  const sizeStyles = {
    sm: { padding: '1rem', fontSize: '0.875rem' },
    md: { padding: '1.5rem', fontSize: '1rem' },
    lg: { padding: '2rem', fontSize: '1.125rem' },
  };

  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    outline: {
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
    },
    filled: {
      border: 'none',
      borderRadius: '0.5rem',
      backgroundColor: '#f8fafc',
    },
    elevated: {
      border: 'none',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        padding: isPadded ? sizeStyles[size].padding : 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        transform: isHoverable && isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHoverable && isHovered ? '0 8px 12px -2px rgb(0 0 0 / 0.15)' : variantStyles[variant].boxShadow,
        ...(isPadded ? {} : { padding: 0 }),
      }}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, actions }: CardHeaderProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1rem',
    }}
  >
    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>{children}</div>
    {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
  </div>
);

const CardBody = ({ children }: CardBodyProps) => (
  <div style={{ color: '#6b7280', lineHeight: 1.6 }}>{children}</div>
);

const CardFooter = ({ children, divider = true }: CardFooterProps) => (
  <div
    style={{
      marginTop: '1rem',
      paddingTop: divider ? '1rem' : 0,
      borderTop: divider ? '1px solid #e2e8f0' : 'none',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '0.5rem',
    }}
  >
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardBody.displayName = 'CardBody';
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardBody, CardFooter };
