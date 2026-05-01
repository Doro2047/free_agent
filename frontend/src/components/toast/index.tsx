import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';

export type ToastStatus = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  status?: ToastStatus;
  duration?: number;
  isClosable?: boolean;
  position?: ToastPosition;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, options: Partial<ToastOptions>) => void;
  closeAll: () => void;
  success: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => string;
  error: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => string;
  warning: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => string;
  info: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => string;
  loading: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => string;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: Omit<ToastOptions, 'status' | 'title'>
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

let toastCount = 0;

function generateId() {
  return `toast-${++toastCount}-${Date.now()}`;
}

export interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  defaultDuration?: number;
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = 'top-right',
  defaultDuration = 5000,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = options.id || generateId();
    const toast: ToastItem = {
      id,
      createdAt: Date.now(),
      position: position,
      duration: defaultDuration,
      isClosable: true,
      status: 'info',
      ...options,
    };

    setToasts(prev => {
      const newToasts = [...prev, toast];
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }
      return newToasts;
    });

    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, toast.duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [position, defaultDuration, maxToasts, removeToast]);

  const updateToast = useCallback((id: string, options: Partial<ToastOptions>) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, ...options } : t))
    );
  }, []);

  const closeAll = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const success = useCallback((message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    return addToast({
      ...options,
      status: 'success',
      title: message,
    });
  }, [addToast]);

  const error = useCallback((message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    return addToast({
      ...options,
      status: 'error',
      title: message,
    });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    return addToast({
      ...options,
      status: 'warning',
      title: message,
    });
  }, [addToast]);

  const info = useCallback((message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    return addToast({
      ...options,
      status: 'info',
      title: message,
    });
  }, [addToast]);

  const loading = useCallback((message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    return addToast({
      ...options,
      status: 'loading',
      title: message,
      duration: 0,
    });
  }, [addToast]);

  const promise = useCallback(async <T,>(
    promiseFn: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: Omit<ToastOptions, 'status' | 'title'>
  ): Promise<T> => {
    const id = loading(messages.loading, options);
    
    try {
      const data = await promiseFn;
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(data) 
        : messages.success;
      updateToast(id, {
        status: 'success',
        title: successMessage,
        duration: defaultDuration,
      });
      return data;
    } catch (err) {
      const errorMessage = typeof messages.error === 'function'
        ? messages.error(err)
        : messages.error;
      updateToast(id, {
        status: 'error',
        title: errorMessage,
        duration: defaultDuration,
      });
      throw err;
    }
  }, [loading, updateToast, defaultDuration]);

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    closeAll,
    success,
    error,
    warning,
    info,
    loading,
    promise,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} position={position} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
  position: ToastPosition;
}

function ToastContainer({ toasts, removeToast, position }: ToastContainerProps) {
  const groupedToasts = React.useMemo(() => {
    return toasts.filter(t => t.position === position);
  }, [toasts, position]);

  if (groupedToasts.length === 0) return null;

  const isTop = position.includes('top');
  const isCenter = position.includes('center');

  return (
    <div
      style={{
        position: 'fixed',
        top: isTop ? '20px' : 'auto',
        bottom: !isTop ? '20px' : 'auto',
        ...(isCenter
          ? { left: '50%', transform: 'translateX(-50%)' }
          : position.includes('left')
          ? { left: '20px' }
          : position.includes('right')
          ? { right: '20px' }
          : { left: '50%', transform: 'translateX(-50%)' }),
        display: 'flex',
        flexDirection: isTop ? 'column' : 'column-reverse',
        gap: '8px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {groupedToasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: ToastItem;
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  const statusColors: Record<ToastStatus, { bg: string; border: string; icon: string }> = {
    success: { bg: '#d1fae5', border: '#10b981', icon: '✓' },
    error: { bg: '#fee2e2', border: '#ef4444', icon: '✕' },
    warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠' },
    info: { bg: '#dbeafe', border: '#3b82f6', icon: 'ℹ' },
    loading: { bg: '#f3f4f6', border: '#6b7280', icon: '⟳' },
  };

  const colors = statusColors[toast.status || 'info'];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        borderLeft: `4px solid ${colors.border}`,
        padding: '16px',
        minWidth: '300px',
        maxWidth: '500px',
        pointerEvents: 'auto',
        opacity: isVisible ? (isLeaving ? 0 : 1) : 0,
        transform: isVisible
          ? isLeaving
            ? 'translateX(100%)'
            : 'translateX(0)'
          : 'translateX(100%)',
        transition: 'all 200ms ease-out',
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: colors.bg,
            color: colors.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            flexShrink: 0,
          }}
        >
          {toast.icon || (toast.status === 'loading' ? (
            <span style={{ animation: 'spin 1s linear infinite' }}>{colors.icon}</span>
          ) : colors.icon)}
        </div>
        <div style={{ flex: 1 }}>
          {toast.title && (
            <div style={{ fontWeight: 600, marginBottom: toast.description ? '4px' : 0 }}>
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {toast.description}
            </div>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '14px',
                color: colors.border,
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        {toast.isClosable && (
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9ca3af',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export const Toast = {
  success: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    console.warn('Toast.success must be used within ToastProvider');
  },
  error: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    console.warn('Toast.error must be used within ToastProvider');
  },
  warning: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    console.warn('Toast.warning must be used within ToastProvider');
  },
  info: (message: string, options?: Omit<ToastOptions, 'status' | 'title'>) => {
    console.warn('Toast.info must be used within ToastProvider');
  },
};

export default ToastProvider;
