import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

export interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
}

export interface OfflineContextValue {
  isOnline: boolean;
  isOffline: boolean;
  offlineQueue: Array<{
    id: string;
    action: string;
    payload: unknown;
    timestamp: number;
    retries: number;
  }>;
  pendingActions: number;
  cache: Map<string, CachedData>;
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T, ttl?: number) => void;
  clearCache: () => void;
  removeCachedData: (key: string) => void;
  queueAction: (action: string, payload: unknown) => string;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  syncData: () => Promise<void>;
  lastSyncTime: number | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  syncError: string | null;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

const CACHE_STORAGE_KEY = 'free-agent-offline-cache';
const QUEUE_STORAGE_KEY = 'free-agent-offline-queue';
const MAX_RETRIES = 3;
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

function loadCacheFromStorage(): Map<string, CachedData> {
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CachedData[];
      const cache = new Map<string, CachedData>();
      parsed.forEach((item) => {
        if (!item.expiresAt || item.expiresAt > Date.now()) {
          cache.set(item.key, item);
        }
      });
      return cache;
    }
  } catch {}
  return new Map();
}

function saveCacheToStorage(cache: Map<string, CachedData>) {
  try {
    const data = Array.from(cache.values());
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadQueueFromStorage(): OfflineContextValue['offlineQueue'] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {}
  return [];
}

function saveQueueToStorage(queue: OfflineContextValue['offlineQueue']) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}

export interface OfflineProviderProps {
  children: ReactNode;
  onSync?: (queue: OfflineContextValue['offlineQueue']) => Promise<void>;
  onOnline?: () => void;
  onOffline?: () => void;
  autoSync?: boolean;
  syncInterval?: number;
}

export function OfflineProvider({
  children,
  onSync,
  onOnline,
  onOffline,
  autoSync = true,
  syncInterval = 30000,
}: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [cache, setCache] = useState<Map<string, CachedData>>(() => loadCacheFromStorage());
  const [offlineQueue, setOfflineQueue] = useState<OfflineContextValue['offlineQueue']>(() =>
    loadQueueFromStorage()
  );
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      onOnline?.();
      if (autoSync) {
        processQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, onOnline, onOffline]);

  useEffect(() => {
    saveCacheToStorage(cache);
  }, [cache]);

  useEffect(() => {
    saveQueueToStorage(offlineQueue);
  }, [offlineQueue]);

  const getCachedData = useCallback(<T,>(key: string): T | null => {
    const cached = cache.get(key);
    if (!cached) return null;
    if (cached.expiresAt && cached.expiresAt < Date.now()) {
      const newCache = new Map(cache);
      newCache.delete(key);
      setCache(newCache);
      return null;
    }
    return cached.data as T;
  }, [cache]);

  const setCachedData = useCallback(<T,>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
    const cached: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    const newCache = new Map(cache);
    newCache.set(key, cached);
    setCache(newCache);
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache(new Map());
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }, []);

  const removeCachedData = useCallback((key: string) => {
    const newCache = new Map(cache);
    newCache.delete(key);
    setCache(newCache);
  }, [cache]);

  const queueAction = useCallback((action: string, payload: unknown): string => {
    const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const queueItem = {
      id,
      action,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    setOfflineQueue((prev) => [...prev, queueItem]);
    return id;
  }, []);

  const processQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;
    if (!navigator.onLine) return;

    setSyncStatus('syncing');
    setSyncError(null);

    const itemsToProcess = [...offlineQueue];
    const failedItems: typeof offlineQueue = [];

    for (const item of itemsToProcess) {
      try {
        if (onSync) {
          await onSync([item]);
        }
      } catch (error) {
        console.error(`Failed to process action ${item.id}:`, error);
        failedItems.push({
          ...item,
          retries: item.retries + 1,
        });
      }
    }

    const retriedItems = failedItems.filter((item) => item.retries < MAX_RETRIES);
    const permanentFailures = failedItems.filter((item) => item.retries >= MAX_RETRIES);

    if (permanentFailures.length > 0) {
      console.warn(`Permanently failed ${permanentFailures.length} actions:`, permanentFailures);
    }

    setOfflineQueue(retriedItems);
    setLastSyncTime(Date.now());
    setSyncStatus(retriedItems.length > 0 ? 'error' : 'idle');
    
    if (retriedItems.length > 0) {
      setSyncError(`${retriedItems.length} actions failed to sync`);
    }
  }, [offlineQueue, onSync]);

  const clearQueue = useCallback(() => {
    setOfflineQueue([]);
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  }, []);

  const syncData = useCallback(async () => {
    await processQueue();
  }, [processQueue]);

  useEffect(() => {
    if (!autoSync || !isOnline) return;

    const interval = setInterval(() => {
      if (offlineQueue.length > 0) {
        processQueue();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, isOnline, offlineQueue.length, syncInterval, processQueue]);

  const value = useMemo(() => ({
    isOnline,
    isOffline: !isOnline,
    offlineQueue,
    pendingActions: offlineQueue.length,
    cache,
    getCachedData,
    setCachedData,
    clearCache,
    removeCachedData,
    queueAction,
    processQueue,
    clearQueue,
    syncData,
    lastSyncTime,
    syncStatus,
    syncError,
  }), [
    isOnline,
    offlineQueue,
    cache,
    getCachedData,
    setCachedData,
    clearCache,
    removeCachedData,
    queueAction,
    processQueue,
    clearQueue,
    syncData,
    lastSyncTime,
    syncStatus,
    syncError,
  ]);

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export interface OfflineIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
  message?: string;
}

export function OfflineIndicator({
  className,
  style,
  message = 'You are currently offline. Changes will be synced when you reconnect.',
}: OfflineIndicatorProps) {
  const { isOffline, pendingActions } = useOffline();

  if (!isOffline) return null;

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        backgroundColor: '#f59e0b',
        color: 'white',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>
        {message}
        {pendingActions > 0 && (
          <span style={{ marginLeft: '8px' }}>
            ({pendingActions} pending {pendingActions === 1 ? 'action' : 'actions'})
          </span>
        )}
      </span>
    </div>
  );
}

export interface OfflineBannerProps {
  className?: string;
  style?: React.CSSProperties;
}

export function OfflineBanner({ className, style }: OfflineBannerProps) {
  const { isOffline, pendingActions, syncStatus, lastSyncTime, syncError } = useOffline();

  const syncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return syncError || 'Sync error';
      default:
        return lastSyncTime
          ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}`
          : 'Not synced';
    }
  };

  return (
    <div
      className={className}
      style={{
        padding: '8px 16px',
        backgroundColor: isOffline ? '#fee2e2' : pendingActions > 0 ? '#fef3c7' : '#d1fae5',
        color: isOffline ? '#991b1b' : pendingActions > 0 ? '#92400e' : '#065f46',
        fontSize: '13px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        ...style,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {isOffline ? (
          <>
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          </>
        ) : pendingActions > 0 ? (
          <>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </>
        ) : (
          <>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </>
        )}
      </svg>
      <span>
        {isOffline
          ? 'Offline'
          : syncStatus === 'syncing'
          ? 'Syncing...'
          : pendingActions > 0
          ? `${pendingActions} pending`
          : 'Synced'}
      </span>
    </div>
  );
}

export interface OfflineProvider {
  (props: OfflineProviderProps): React.ReactElement;
  Indicator: typeof OfflineIndicator;
  Banner: typeof OfflineBanner;
}

export const Offline = {
  Provider: OfflineProvider,
  Indicator: OfflineIndicator,
  Banner: OfflineBanner,
};

export default OfflineProvider;
