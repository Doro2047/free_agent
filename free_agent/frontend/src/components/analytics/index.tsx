import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  categories?: string[];
  timestamp?: number;
}

export interface UserTraits {
  id?: string;
  email?: string;
  name?: string;
  plan?: string;
  createdAt?: number;
  [key: string]: unknown;
}

export interface PageView {
  url: string;
  title?: string;
  referrer?: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsConfig {
  appId?: string;
  apiKey?: string;
  debug?: boolean;
  autoTrack?: boolean;
  trackPageView?: boolean;
  trackClicks?: boolean;
  trackForms?: boolean;
  trackErrors?: boolean;
  trackPerformance?: boolean;
  sampleRate?: number;
  flushInterval?: number;
  maxQueueSize?: number;
}

export interface AnalyticsContextValue {
  track: (event: AnalyticsEvent | string, properties?: Record<string, unknown>) => void;
  trackPageView: (page: PageView | string) => void;
  identify: (userId: string, traits?: UserTraits) => void;
  alias: (userId: string, previousId: string) => void;
  group: (groupId: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
  setUserProperties: (traits: UserTraits) => void;
  incrementUserProperty: (property: string, value?: number) => void;
  decrementUserProperty: (property: string, value?: number) => void;
  optOut: () => void;
  optIn: () => void;
  isOptOut: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  getSessionId: () => string | null;
  getUserId: () => string | null;
  getAnonymousId: () => string;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

const STORAGE_KEY_ANONYMOUS_ID = 'free-agent-analytics-anonymous-id';
const STORAGE_KEY_USER_ID = 'free-agent-analytics-user-id';
const STORAGE_KEY_OPT_OUT = 'free-agent-analytics-opt-out';

function generateAnonymousId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getOrCreateAnonymousId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY_ANONYMOUS_ID);
    if (!id) {
      id = generateAnonymousId();
      localStorage.setItem(STORAGE_KEY_ANONYMOUS_ID, id);
    }
    return id;
  } catch {
    return generateAnonymousId();
  }
}

function getUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_USER_ID);
  } catch {
    return null;
  }
}

function setUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    } else {
      localStorage.removeItem(STORAGE_KEY_USER_ID);
    }
  } catch {}
}

function getOptOut(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_OPT_OUT) === 'true';
  } catch {
    return false;
  }
}

function setOptOut(optOut: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_OPT_OUT, optOut.toString());
  } catch {}
}

export interface AnalyticsProviderProps {
  children: ReactNode;
  config?: AnalyticsConfig;
  plugins?: AnalyticsPlugin[];
}

export interface AnalyticsPlugin {
  name: string;
  initialize?: (config: AnalyticsConfig) => void;
  track?: (event: AnalyticsEvent) => void;
  page?: (page: PageView) => void;
  identify?: (userId: string, traits?: UserTraits) => void;
  alias?: (userId: string, previousId: string) => void;
  group?: (groupId: string, traits?: Record<string, unknown>) => void;
  flush?: () => Promise<void>;
  destroy?: () => void;
}

export function AnalyticsProvider({
  children,
  config = {},
  plugins = [],
}: AnalyticsProviderProps) {
  const [isOptOut, setIsOptOutState] = useState(getOptOut);
  const [isEnabled, setEnabled] = useState(true);
  const [anonymousId] = useState(getOrCreateAnonymousId);
  const sessionIdRef = useRef<string | null>(null);
  const queueRef = useRef<AnalyticsEvent[]>([]);
  const userIdRef = useRef<string | null>(getUserId());
  const userTraitsRef = useRef<UserTraits>({});
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pluginsRef = useRef<AnalyticsPlugin[]>(plugins);

  const {
    debug = false,
    autoTrack = true,
    trackPageView = true,
    trackClicks = true,
    trackErrors = true,
    trackPerformance = true,
    sampleRate = 1,
    flushInterval = 5000,
    maxQueueSize = 20,
  } = config;

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      let sessionId = sessionStorage.getItem('free-agent-session-id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        sessionStorage.setItem('free-agent-session-id', sessionId);
      }
      sessionIdRef.current = sessionId;
    }
  }, []);

  useEffect(() => {
    pluginsRef.current = plugins;
    plugins.forEach(plugin => {
      plugin.initialize?.(config);
    });
    return () => {
      plugins.forEach(plugin => {
        plugin.destroy?.();
      });
    };
  }, [plugins, config]);

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[Analytics]', ...args);
    }
  }, [debug]);

  const shouldTrack = useCallback((): boolean => {
    if (!isEnabled || isOptOut) return false;
    if (sampleRate < 1 && Math.random() > sampleRate) return false;
    return true;
  }, [isEnabled, isOptOut, sampleRate]);

  const flush = useCallback(async () => {
    const queue = [...queueRef.current];
    queueRef.current = [];

    for (const event of queue) {
      pluginsRef.current.forEach(plugin => {
        plugin.track?.(event);
      });
    }

    await Promise.all(
      pluginsRef.current.map(plugin => plugin.flush?.() || Promise.resolve())
    );
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(() => {
      flush();
    }, flushInterval);
  }, [flush, flushInterval]);

  const track = useCallback((
    event: AnalyticsEvent | string,
    properties?: Record<string, unknown>
  ) => {
    if (!shouldTrack()) {
      log('Track skipped (opt-out or disabled):', event);
      return;
    }

    const analyticsEvent: AnalyticsEvent = typeof event === 'string'
      ? { name: event, properties }
      : event;

    analyticsEvent.timestamp = Date.now();
    analyticsEvent.properties = {
      ...analyticsEvent.properties,
      anonymous_id: anonymousId,
      session_id: sessionIdRef.current,
      ...(userIdRef.current && { user_id: userIdRef.current }),
    };

    log('Track:', analyticsEvent);

    queueRef.current.push(analyticsEvent);

    if (queueRef.current.length >= maxQueueSize) {
      flush();
    } else {
      scheduleFlush();
    }
  }, [shouldTrack, log, anonymousId, maxQueueSize, scheduleFlush, flush]);

  const trackPageView = useCallback((page: PageView | string) => {
    if (!shouldTrack()) return;

    const pageView: PageView = typeof page === 'string'
      ? { url: page }
      : page;

    pageView.url = pageView.url || (typeof window !== 'undefined' ? window.location.href : '');
    pageView.referrer = pageView.referrer || (typeof document !== 'undefined' ? document.referrer : '');

    log('Page View:', pageView);

    pluginsRef.current.forEach(plugin => {
      plugin.page?.(pageView);
    });
  }, [shouldTrack, log]);

  const identify = useCallback((userId: string, traits?: UserTraits) => {
    userIdRef.current = userId;
    setUserId(userId);
    userTraitsRef.current = { ...userTraitsRef.current, ...traits };

    log('Identify:', userId, traits);

    pluginsRef.current.forEach(plugin => {
      plugin.identify?.(userId, traits);
    });
  }, [log]);

  const alias = useCallback((userId: string, previousId: string) => {
    log('Alias:', userId, previousId);

    pluginsRef.current.forEach(plugin => {
      plugin.alias?.(userId, previousId);
    });
  }, [log]);

  const group = useCallback((groupId: string, traits?: Record<string, unknown>) => {
    log('Group:', groupId, traits);

    pluginsRef.current.forEach(plugin => {
      plugin.group?.(groupId, traits);
    });
  }, [log]);

  const reset = useCallback(() => {
    userIdRef.current = null;
    setUserId(null);
    userTraitsRef.current = {};
    queueRef.current = [];
    anonymousId;

    log('Reset');
  }, [log, anonymousId]);

  const setUserProperties = useCallback((traits: UserTraits) => {
    userTraitsRef.current = { ...userTraitsRef.current, ...traits };

    log('Set User Properties:', traits);

    if (userIdRef.current) {
      pluginsRef.current.forEach(plugin => {
        plugin.identify?.(userIdRef.current!, userTraitsRef.current);
      });
    }
  }, [log]);

  const incrementUserProperty = useCallback((property: string, value: number = 1) => {
    const current = (userTraitsRef.current[property] as number) || 0;
    userTraitsRef.current = {
      ...userTraitsRef.current,
      [property]: current + value,
    };

    log('Increment User Property:', property, value);

    if (userIdRef.current) {
      pluginsRef.current.forEach(plugin => {
        plugin.identify?.(userIdRef.current!, userTraitsRef.current);
      });
    }
  }, [log]);

  const decrementUserProperty = useCallback((property: string, value: number = 1) => {
    incrementUserProperty(property, -value);
  }, [incrementUserProperty]);

  const optOut = useCallback(() => {
    setIsOptOutState(true);
    setOptOut(true);
    queueRef.current = [];
    log('Opted out');
  }, [log]);

  const optIn = useCallback(() => {
    setIsOptOutState(false);
    setOptOut(false);
    log('Opted in');
  }, [log]);

  const getSessionId = useCallback(() => {
    return sessionIdRef.current;
  }, []);

  const getUserId = useCallback(() => {
    return userIdRef.current;
  }, []);

  const getAnonymousId = useCallback(() => {
    return anonymousId;
  }, [anonymousId]);

  useEffect(() => {
    if (!autoTrack) return;

    if (trackPageView && typeof window !== 'undefined') {
      trackPageView(window.location.href);
    }

    if (trackClicks && typeof window !== 'undefined') {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const trackable = target.closest('[data-track]');
        if (trackable) {
          const eventName = trackable.getAttribute('data-track');
          const properties: Record<string, unknown> = {
            element_text: trackable.textContent?.trim(),
            element_id: trackable.id || undefined,
            element_class: trackable.className || undefined,
          };
          track(eventName || 'click', properties);
        }
      };

      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [autoTrack, trackPageView, trackClicks, track]);

  useEffect(() => {
    if (!autoTrack || !trackErrors) return;

    const handleError = (event: ErrorEvent) => {
      track('error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      track('unhandled_rejection', {
        reason: event.reason?.message || String(event.reason),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [autoTrack, trackErrors, track]);

  useEffect(() => {
    if (!autoTrack || !trackPerformance) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          track('page_performance', {
            url: window.location.href,
            load_time: nav.loadEventEnd - nav.startTime,
            dom_content_loaded: nav.domContentLoadedEventEnd - nav.startTime,
            first_paint: nav.responseStart - nav.requestStart,
            dns_lookup: nav.domainLookupEnd - nav.domainLookupStart,
            tcp_connect: nav.connectEnd - nav.connectStart,
            server_response: nav.responseEnd - nav.requestStart,
          });
        }
        if (entry.entryType === 'paint') {
          track('paint_performance', {
            url: window.location.href,
            name: entry.name,
            value: entry.startTime,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['navigation', 'paint'] });

    return () => observer.disconnect();
  }, [autoTrack, trackPerformance, track]);

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flush();
    };
  }, [flush]);

  const value = useMemo(() => ({
    track,
    trackPageView,
    identify,
    alias,
    group,
    reset,
    setUserProperties,
    incrementUserProperty,
    decrementUserProperty,
    optOut,
    optIn,
    isOptOut,
    isEnabled,
    setEnabled,
    getSessionId,
    getUserId,
    getAnonymousId,
  }), [
    track,
    trackPageView,
    identify,
    alias,
    group,
    reset,
    setUserProperties,
    incrementUserProperty,
    decrementUserProperty,
    optOut,
    optIn,
    isOptOut,
    isEnabled,
    setEnabled,
    getSessionId,
    getUserId,
    getAnonymousId,
  ]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export interface AnalyticsEventTracker {
  (event: AnalyticsEvent | string, properties?: Record<string, unknown>): void;
}

export function useTrack() {
  const { track } = useAnalytics();
  return track;
}

export function usePageView() {
  const { trackPageView } = useAnalytics();
  return trackPageView;
}

export interface TrackClickProps {
  event: string;
  properties?: Record<string, unknown>;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: unknown;
}

export function TrackClick({ event, properties, children, as: Component = 'button', ...props }: TrackClickProps) {
  const { track } = useAnalytics();

  const handleClick = () => {
    track(event, properties);
  };

  return (
    <Component {...props} onClick={handleClick}>
      {children}
    </Component>
  );
}

export function useAnalyticsConfig() {
  const { isOptOut, isEnabled, optIn, optOut, setEnabled } = useAnalytics();
  return { isOptOut, isEnabled, optIn, optOut, setEnabled };
}

export const ConsolePlugin: AnalyticsPlugin = {
  name: 'console',
  initialize: () => {},
  track: (event) => {
    console.log('[Analytics Plugin: Console]', event);
  },
  page: (page) => {
    console.log('[Analytics Plugin: Console] Page View:', page);
  },
  identify: (userId, traits) => {
    console.log('[Analytics Plugin: Console] Identify:', userId, traits);
  },
};

export function createAnalyticsProvider(config: AnalyticsConfig, plugins?: AnalyticsPlugin[]) {
  return function AnalyticsProviderWrapper({ children }: { children: ReactNode }) {
    return (
      <AnalyticsProvider config={config} plugins={plugins}>
        {children}
      </AnalyticsProvider>
    );
  };
}

export const Analytics = {
  Provider: AnalyticsProvider,
  useTrack,
  usePageView,
  TrackClick,
  ConsolePlugin,
  createProvider: createAnalyticsProvider,
};

export default AnalyticsProvider;
