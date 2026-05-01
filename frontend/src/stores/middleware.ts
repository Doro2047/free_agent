import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { useStorage } from '../utils/storage';

export type ImmerPlugin = (
  config: StateCreator<object>,
  initializer: (state: object) => void
) => StateCreator<object>;

export interface LoggerMiddlewareOptions {
  enabled?: boolean;
  prefix?: string;
  showTimestamp?: boolean;
  collapsed?: boolean;
  stateTransformer?: (state: object) => object;
  actionTransformer?: (action: object) => object;
}

export function createLoggerMiddleware(options: LoggerMiddlewareOptions = {}) {
  const {
    enabled = true,
    prefix = 'zustand',
    showTimestamp = true,
    collapsed = false,
    stateTransformer = (state) => state,
    actionTransformer = (action) => action,
  } = options;

  return (config: StateCreator<object>) => (set, get, api) => {
    const loggedSet = (...args: Parameters<typeof set>) => {
      if (!enabled) {
        return set(...args);
      }

      const timestamp = new Date().toISOString();
      const action = args[0];
      const isFunction = typeof action === 'function';

      if (collapsed) {
        console.groupCollapsed(
          showTimestamp ? `${prefix} @ ${timestamp}` : prefix
        );
      } else {
        console.group(
          showTimestamp ? `${prefix} @ ${timestamp}` : prefix
        );
      }

      console.log('%c previous', 'color: #9E9E9E; font-weight: bold', stateTransformer(get()));
      
      if (isFunction) {
        console.log('%c action', 'color: #03A9F4; font-weight: bold', 'function');
      } else {
        console.log('%c action', 'color: #03A9F4; font-weight: bold', actionTransformer(action));
      }

      set(...args);

      console.log('%c next', 'color: #4CAF50; font-weight: bold', stateTransformer(get()));
      console.groupEnd();
    };

    return config(loggedSet as typeof set, get, api);
  };
}

export interface DevtoolsMiddlewareOptions {
  name?: string;
  enabled?: boolean;
  maxAge?: number;
  latency?: number;
}

export function createDevtoolsMiddleware(options: DevtoolsMiddlewareOptions = {}) {
  const {
    name = 'zustand-store',
    enabled = process.env.NODE_ENV !== 'production',
    maxAge = 50,
    latency = 500,
  } = options;

  let devtools: typeof import('zustand/middleware').devtools | null = null;

  if (enabled && typeof window !== 'undefined') {
    try {
      devtools = require('zustand/middleware').devtools;
    } catch {
      console.warn('Zustand devtools not available');
    }
  }

  if (!devtools) {
    return (config: StateCreator<object>) => config;
  }

  return devtools({ name, maxAge, latency });
}

export interface SubscribeWithSelectorMiddlewareOptions {
  enabled?: boolean;
}

export function createSubscribeWithSelectorMiddleware(
  options: SubscribeWithSelectorMiddlewareOptions = {}
) {
  const { enabled = true } = options;

  if (!enabled) {
    return (config: StateCreator<object>) => config;
  }

  return require('zustand/middleware').subscribeWithSelector;
}

export interface CombineMiddlewareOptions {
  middlewares: Array<StateCreator<object>>;
}

export function combineMiddlewares(
  config: StateCreator<object>,
  middlewares: Array<StateCreator<object>>
): StateCreator<object> {
  return middlewares.reduce((acc, middleware) => {
    return middleware(acc);
  }, config);
}

export function createPersistMiddleware<T extends object>(
  options: PersistOptions<T, T>
) {
  const storage = useStorage();

  return persist(options, {
    storage: createJSONStorage(() => storage),
    partialize: (state) => state,
    merge: (persisted, current) => ({
      ...current,
      ...(persisted as object),
    }),
  });
}

export interface PeriodicSyncMiddlewareOptions {
  interval?: number;
  syncKey: string;
  onSync?: (state: object) => void;
}

export function createPeriodicSyncMiddleware<T extends object>(
  options: PeriodicSyncMiddlewareOptions
) {
  const { interval = 30000, syncKey, onSync } = options;

  return (config: StateCreator<T>) => (set, get, api) => {
    const store = config(
      (partial) => {
        set(partial as Partial<T>);
        if (onSync) {
          onSync(get());
        }
      },
      get,
      api
    );

    const intervalId = setInterval(() => {
      if (onSync) {
        onSync(get());
      }
    }, interval);

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(intervalId);
      });
    }

    return store;
  };
}

export interface RetryMiddlewareOptions {
  retries?: number;
  delay?: number;
  shouldRetry?: (error: Error) => boolean;
}

export function createRetryMiddleware<T extends object>(
  options: RetryMiddlewareOptions = {}
) {
  const { retries = 3, delay = 1000, shouldRetry } = options;

  return (config: StateCreator<T>) => (set, get, api) => {
    const retrySet = async (...args: Parameters<typeof set>) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          set(...args);
          return;
        } catch (error) {
          lastError = error as Error;

          if (shouldRetry && !shouldRetry(lastError)) {
            throw lastError;
          }

          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
          }
        }
      }

      throw lastError;
    };

    return config(retrySet as typeof set, get, api);
  };
}

export interface ImmerMiddlewareOptions {
  enabled?: boolean;
}

export function createImmerMiddleware<T extends object>(
  options: ImmerMiddlewareOptions = {}
) {
  const { enabled = true } = options;

  if (!enabled) {
    return (config: StateCreator<T>) => config;
  }

  try {
    const { immer } = require('zustand/middleware/immer');
    return immer;
  } catch {
    console.warn('Immer middleware not available');
    return (config: StateCreator<T>) => config;
  }
}

export interface AnalyticsMiddlewareOptions {
  trackActions?: boolean;
  trackState?: boolean;
  trackTime?: boolean;
  category?: string;
  onTrack?: (data: {
    action?: string;
    state?: object;
    duration?: number;
    timestamp: number;
    category?: string;
  }) => void;
}

export function createAnalyticsMiddleware<T extends object>(
  options: AnalyticsMiddlewareOptions = {}
) {
  const {
    trackActions = true,
    trackState = false,
    trackTime = true,
    category = 'store',
    onTrack,
  } = options;

  return (config: StateCreator<T>) => (set, get, api) => {
    const trackedSet = (...args: Parameters<typeof set>) => {
      const timestamp = Date.now();
      const prevState = get();

      if (trackTime) {
        console.time(`${category} - set`);
      }

      set(...args);

      if (trackTime) {
        console.timeEnd(`${category} - set`);
      }

      const newState = get();
      const action = typeof args[0] === 'function' ? 'update' : args[0];

      if (trackActions || trackState) {
        const data = {
          action: trackActions ? action : undefined,
          state: trackState ? newState : undefined,
          timestamp,
          category,
        };

        if (onTrack) {
          onTrack(data);
        }
      }
    };

    return config(trackedSet as typeof set, get, api);
  };
}

export interface UndoRedoMiddlewareOptions {
  maxHistory?: number;
  enableUndo?: boolean;
  enableRedo?: boolean;
  namespace?: string;
}

export interface UndoRedoState {
  past: object[];
  future: object[];
}

export function createUndoRedoMiddleware<T extends object>(
  options: UndoRedoMiddlewareOptions = {}
) {
  const {
    maxHistory = 50,
    enableUndo = true,
    enableRedo = true,
    namespace = 'history',
  } = options;

  type WithUndoRedo = T & {
    [K in typeof namespace]: UndoRedoState;
  } & {
    undo?: () => void;
    redo?: () => void;
    clearHistory?: () => void;
  };

  return (config: StateCreator<T>) => (set, get, api) => {
    let past: object[] = [];
    let future: object[] = [];

    const trackedSet: typeof set = (...args) => {
      const action = args[0];
      const isFunction = typeof action === 'function';

      if (isFunction) {
        const prevState = get();
        const nextState = action(prevState);

        past = [...past, prevState].slice(-maxHistory);
        future = [];
      }

      set(...args);
    };

    const undo = () => {
      if (!enableUndo || past.length === 0) return;

      const previous = past[past.length - 1];
      past = past.slice(0, -1);
      future = [get(), ...future].slice(0, maxHistory);

      set(previous as Partial<T>);
    };

    const redo = () => {
      if (!enableRedo || future.length === 0) return;

      const next = future[0];
      future = future.slice(1);
      past = [...past, get()].slice(-maxHistory);

      set(next as Partial<T>);
    };

    const clearHistory = () => {
      past = [];
      future = [];
    };

    const store = config(trackedSet as typeof set, get, api);

    return {
      ...store,
      [namespace]: {
        get past() { return past; },
        get future() { return future; },
        canUndo: enableUndo && past.length > 0,
        canRedo: enableRedo && future.length > 0,
      },
      undo,
      redo,
      clearHistory,
    } as WithUndoRedo;
  };
}

export function createStoreEnhancer<T extends object>(
  middlewares: Array<StateCreator<object>>
) {
  return (config: StateCreator<T>) => {
    return combineMiddlewares(config, middlewares);
  };
}

export const defaultMiddlewares = {
  logger: createLoggerMiddleware(),
  devtools: createDevtoolsMiddleware(),
};

export function createStoreWithMiddlewares<T extends object>(
  config: StateCreator<T>,
  middlewares: Array<StateCreator<object>>
): StateCreator<T> {
  return createStoreEnhancer(middlewares)(config);
}
