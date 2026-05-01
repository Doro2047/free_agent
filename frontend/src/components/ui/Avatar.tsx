import React from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  isRounded?: boolean;
  onClick?: () => void;
}

const Avatar = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  isRounded = false,
  onClick,
}: AvatarProps) => {
  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const getBackgroundColor = (name: string): string => {
    const colors = [
      '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const sizeStyles: Record<AvatarSize, { width: string; height: string; fontSize: string; badgeSize: string }> = {
    xs: { width: '1.5rem', height: '1.5rem', fontSize: '0.625rem', badgeSize: '0.5rem' },
    sm: { width: '2rem', height: '2rem', fontSize: '0.75rem', badgeSize: '0.625rem' },
    md: { width: '2.5rem', height: '2.5rem', fontSize: '0.875rem', badgeSize: '0.75rem' },
    lg: { width: '3rem', height: '3rem', fontSize: '1rem', badgeSize: '1rem' },
    xl: { width: '4rem', height: '4rem', fontSize: '1.25rem', badgeSize: '1.25rem' },
    '2xl': { width: '6rem', height: '6rem', fontSize: '1.5rem', badgeSize: '1.5rem' },
  };

  const statusColors: Record<AvatarStatus, string> = {
    online: '#22c55e',
    offline: '#9ca3af',
    busy: '#ef4444',
    away: '#f59e0b',
  };

  const dimensions = sizeStyles[size];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          onClick={onClick}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: isRounded ? '9999px' : '0.5rem',
            objectFit: 'cover',
            cursor: onClick ? 'pointer' : 'default',
          }}
        />
      ) : name ? (
        <div
          onClick={onClick}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: isRounded ? '9999px' : '0.5rem',
            backgroundColor: getBackgroundColor(name),
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: dimensions.fontSize,
            fontWeight: 600,
            cursor: onClick ? 'pointer' : 'default',
          }}
        >
          {getInitials(name)}
        </div>
      ) : (
        <div
          onClick={onClick}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: isRounded ? '9999px' : '0.5rem',
            backgroundColor: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: onClick ? 'pointer' : 'default',
          }}
        >
          <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}

      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dimensions.badgeSize,
            height: dimensions.badgeSize,
            borderRadius: '50%',
            backgroundColor: statusColors[status],
            border: '2px solid #ffffff',
          }}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';

export { Avatar };
