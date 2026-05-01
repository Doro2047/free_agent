import { Component, ReactNode, ErrorInfo } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showStack?: boolean;
  showRefresh?: boolean;
  title?: string;
  description?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);

    if (typeof console !== 'undefined') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showStack = false, showRefresh = true, title = '出错了', description = '应用程序遇到了一些问题，请稍后再试。' } = this.props;

    if (hasError) {
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error!, errorInfo!);
        }
        return fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          minHeight: '200px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            marginBottom: '1rem',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '0.5rem',
          }}>
            {title}
          </h2>

          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '1rem',
            maxWidth: '400px',
          }}>
            {description}
          </p>

          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#fef2f2',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#991b1b',
              maxWidth: '500px',
              wordBreak: 'break-word',
            }}>
              {error.message}
            </div>
          )}

          {showStack && errorInfo && (
            <details style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              maxWidth: '600px',
              textAlign: 'left',
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 500,
                marginBottom: '0.5rem',
              }}>
                错误堆栈
              </summary>
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
              }}>
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          {showRefresh && (
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              重试
            </button>
          )}
        </div>
      );
    }

    return children;
  }
}

export function createAsyncErrorBoundary(
  WrappedComponent: React.ComponentType<unknown>,
  errorFallback?: ReactNode
): typeof ErrorBoundary {
  return class AsyncErrorBoundary extends ErrorBoundary {
    static displayName = `AsyncErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

    constructor(props: Omit<ErrorBoundaryProps, 'fallback'>) {
      super({
        ...props,
        fallback: errorFallback,
      });
    }
  };
}

export interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  spinner?: 'spinner' | 'dots' | 'pulse';
}

export function LoadingState({
  size = 'md',
  color,
  text,
  fullScreen = false,
  overlay = false,
  spinner = 'spinner',
}: LoadingStateProps): ReactNode {
  const sizes = {
    sm: { width: '16px', height: '16px', fontSize: '0.75rem' },
    md: { width: '24px', height: '24px', fontSize: '0.875rem' },
    lg: { width: '32px', height: '32px', fontSize: '1rem' },
    xl: { width: '48px', height: '48px', fontSize: '1.25rem' },
  };

  const spinnerSize = sizes[size];

  const spinnerColors = color || '#3b82f6';

  const renderSpinner = () => {
    switch (spinner) {
      case 'dots':
        return (
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: spinnerSize.width,
                  height: spinnerSize.height,
                  backgroundColor: spinnerColors,
                  borderRadius: '50%',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div
            style={{
              width: spinnerSize.width,
              height: spinnerSize.height,
              backgroundColor: spinnerColors,
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        );

      default:
        return (
          <svg
            width={spinnerSize.width}
            height={spinnerSize.height}
            viewBox="0 0 24 24"
            fill="none"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke={spinnerColors}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="31.416"
              strokeDashoffset="10"
            />
          </svg>
        );
    }
  };

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        ...(spinner === 'dots' && { flexDirection: 'row' }),
      }}
    >
      {renderSpinner()}
      {text && (
        <span style={{
          color: '#6b7280',
          fontSize: spinnerSize.fontSize,
        }}>
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: overlay ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
          zIndex: 9999,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        ...(overlay && {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        }),
      }}
    >
      {content}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  image,
  size = 'md',
}: EmptyStateProps): ReactNode {
  const sizes = {
    sm: { iconSize: 32, titleSize: '1rem', descSize: '0.75rem' },
    md: { iconSize: 48, titleSize: '1.125rem', descSize: '0.875rem' },
    lg: { iconSize: 64, titleSize: '1.25rem', descSize: '1rem' },
  };

  const sizeConfig = sizes[size];

  const defaultIcon = (
    <svg
      width={sizeConfig.iconSize}
      height={sizeConfig.iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9ca3af"
      strokeWidth="1.5"
    >
      <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        textAlign: 'center',
      }}
    >
      {image ? (
        <img
          src={image}
          alt={title}
          style={{
            width: sizeConfig.iconSize * 2,
            height: sizeConfig.iconSize * 2,
            marginBottom: '1.5rem',
            objectFit: 'contain',
          }}
        />
      ) : (
        <div
          style={{
            width: sizeConfig.iconSize * 2,
            height: sizeConfig.iconSize * 2,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '50%',
          }}
        >
          {icon || defaultIcon}
        </div>
      )}

      <h3
        style={{
          fontSize: sizeConfig.titleSize,
          fontWeight: 600,
          color: '#1f2937',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            fontSize: sizeConfig.descSize,
            color: '#6b7280',
            maxWidth: '400px',
            marginBottom: action ? '1.5rem' : 0,
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({
  width,
  height,
  borderRadius,
  animation = 'pulse',
  variant = 'text',
}: SkeletonProps): ReactNode {
  const defaultDimensions = {
    text: { width: '100%', height: '1rem' },
    circular: { width: '40px', height: '40px', borderRadius: '50%' },
    rectangular: { width: '100%', height: '100px', borderRadius: '0.5rem' },
  };

  const dimensions = defaultDimensions[variant];
  const computedWidth = width || dimensions.width;
  const computedHeight = height || dimensions.height;
  const computedBorderRadius = borderRadius || dimensions.borderRadius;

  const baseStyle: React.CSSProperties = {
    width: computedWidth,
    height: computedHeight,
    borderRadius: computedBorderRadius,
    backgroundColor: '#e5e7eb',
  };

  if (animation === 'none') {
    return <div style={baseStyle} />;
  }

  if (animation === 'pulse') {
    return (
      <div
        style={{
          ...baseStyle,
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
        animation: 'wave 1.5s infinite linear',
      }}
    />
  );
}

export interface SkeletonGroupProps {
  count?: number;
  spacing?: string;
  direction?: 'row' | 'column';
  skeletonProps?: SkeletonProps;
}

export function SkeletonGroup({
  count = 3,
  spacing = '0.5rem',
  direction = 'column',
  skeletonProps = {},
}: SkeletonGroupProps): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: spacing,
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} {...skeletonProps} />
      ))}
    </div>
  );
}

export interface SuspenseFallbackProps {
  isLoading: boolean;
  loader?: ReactNode;
  error?: ReactNode | null;
  children: ReactNode;
  errorBoundary?: boolean;
  onRetry?: () => void;
}

export function SuspenseFallback({
  isLoading,
  loader,
  error,
  children,
  errorBoundary = true,
  onRetry,
}: SuspenseFallbackProps): ReactNode {
  if (error) {
    if (errorBoundary && typeof error === 'object' && 'message' in error) {
      return (
        <ErrorBoundary
          fallback={
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              }
              title="加载失败"
              description="数据加载过程中出现错误"
              action={
                onRetry && (
                  <button
                    onClick={onRetry}
                    style={{
                      padding: '0.5rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    重试
                  </button>
                )
              }
            />
          }
        >
          <div />
        </ErrorBoundary>
      );
    }
    return <>{error}</>;
  }

  if (isLoading) {
    return (
      <>
        {loader || (
          <LoadingState
            fullScreen={false}
            overlay={true}
            text="加载中..."
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color,
  backgroundColor,
  showLabel = false,
  animated = true,
}: ProgressBarProps): ReactNode {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizes = {
    sm: { height: '4px', fontSize: '0.625rem' },
    md: { height: '8px', fontSize: '0.75rem' },
    lg: { height: '12px', fontSize: '0.875rem' },
  };

  const sizeConfig = sizes[size];
  const barColor = color || '#3b82f6';
  const barBg = backgroundColor || '#e5e7eb';

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: sizeConfig.height,
          backgroundColor: barBg,
          borderRadius: sizeConfig.height,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: sizeConfig.height,
            transition: animated ? 'width 0.3s ease' : 'none',
          }}
        />
      </div>
      {showLabel && (
        <div
          style={{
            marginTop: '0.25rem',
            fontSize: sizeConfig.fontSize,
            color: '#6b7280',
            textAlign: 'right',
          }}
        >
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps): ReactNode {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const colors = {
    success: { bg: '#dcfce7', border: '#22c55e', icon: '#22c55e' },
    error: { bg: '#fee2e2', border: '#ef4444', icon: '#ef4444' },
    warning: { bg: '#fef3c7', border: '#f59e0b', icon: '#f59e0b' },
    info: { bg: '#dbeafe', border: '#3b82f6', icon: '#3b82f6' },
  };

  const colorConfig = colors[type];

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        padding: '1rem 1.5rem',
        backgroundColor: colorConfig.bg,
        border: `1px solid ${colorConfig.border}`,
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        zIndex: 9999,
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: '#6b7280',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
