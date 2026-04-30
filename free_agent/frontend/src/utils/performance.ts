type AnyFunction = (...args: any[]) => any;

type MaybePromise<T> = T | Promise<T>;

interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

export function debounce<T extends AnyFunction>(
  fn: T,
  wait: number,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  const { leading = false, trailing = true, maxWait } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime: number | null = null;
  let result: ReturnType<T>;

  const invoke = () => {
    if (lastArgs) {
      result = fn(...lastArgs);
      lastArgs = null;
    }
  };

  const startTimer = (pendingFn: () => void, waitMs: number) => {
    timeoutId = setTimeout(pendingFn, waitMs);
    if (maxWait !== undefined && maxWait > 0) {
      maxTimeoutId = setTimeout(() => {
        timeoutId = null;
        if (lastArgs && trailing) {
          invoke();
        }
      }, maxWait);
    }
  };

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastCallTime = Date.now();

    if (!timeoutId && leading) {
      invoke();
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (trailing) {
      startTimer(invoke, wait);
    }
  };
}

export function throttle<T extends AnyFunction>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  let lastTime: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const invoke = () => {
    if (lastArgs) {
      fn(...lastArgs);
      lastTime = Date.now();
      lastArgs = null;
    }
  };

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    lastArgs = args;

    if (!lastTime) {
      if (leading) {
        fn(...args);
        lastTime = now;
      } else {
        lastTime = now;
      }
      return;
    }

    const remaining = wait - (now - lastTime);

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      fn(...args);
      lastTime = now;
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        invoke();
      }, remaining);
    }
  };

  return throttled;
}

export function memoize<T extends AnyFunction>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  const resolve = resolver ?? ((...args: Parameters<T>) => JSON.stringify(args));

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = resolve(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn.apply(this, args);
    cache.set(key, result as ReturnType<T>);
    return result;
  } as T;
}

export function once<T extends AnyFunction>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    if (!called) {
      called = true;
      result = fn.apply(this, args) as ReturnType<T>;
    }
    return result;
  } as T;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2, onRetry } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === retries) {
        throw lastError;
      }

      const waitTime = delay * Math.pow(backoff, attempt);
      onRetry?.(lastError, attempt + 1);

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function defer<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class LazyLoad<T> {
  private value: T | undefined;
  private initializer: (() => MaybePromise<T>) | null = null;
  private loadingPromise: Promise<T> | null = null;

  constructor(initializer?: () => MaybePromise<T>) {
    if (initializer) {
      this.initializer = initializer;
    }
  }

  setInitializer(initializer: () => MaybePromise<T>): void {
    this.initializer = initializer;
  }

  get(): T | undefined {
    return this.value;
  }

  async load(): Promise<T> {
    if (this.value !== undefined) {
      return this.value;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    if (!this.initializer) {
      throw new Error('LazyLoad: initializer not set');
    }

    this.loadingPromise = Promise.resolve(this.initializer()).then((v) => {
      this.value = v;
      this.loadingPromise = null;
      return v;
    });

    return this.loadingPromise;
  }

  reset(): void {
    this.value = undefined;
    this.loadingPromise = null;
  }
}

export function createEventEmitter<T extends Record<string, any[]>>() {
  const listeners = new Map<keyof T, Set<(...args: any[]) => void>>();

  return {
    on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler as any);
      return () => this.off(event, handler);
    },

    off<K extends keyof T>(event: K, handler: (...args: T[K]) => void): void {
      listeners.get(event)?.delete(handler as any);
    },

    emit<K extends keyof T>(event: K, ...args: T[K]): void {
      listeners.get(event)?.forEach((handler) => {
        try {
          (handler as any)(...args);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    },

    once<K extends keyof T>(event: K, handler: (...args: T[K]) => void): () => void {
      const off = this.on(event, (...args: T[K]) => {
        off();
        handler(...args);
      });
      return off;
    },

    clear(event?: keyof T): void {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    },
  };
}

export function createBatchProcessor<T, R>(
  processor: (items: T[]) => Promise<R[]>,
  options: {
    batchSize?: number;
    maxWait?: number;
  } = {}
) {
  const { batchSize = 10, maxWait = 100 } = options;
  const queue: { item: T; resolve: (value: R) => void; reject: (error: Error) => void }[] = [];
  let processingTimer: ReturnType<typeof setTimeout> | null = null;

  const processBatch = async () => {
    if (queue.length === 0) return;

    const batch = queue.splice(0, batchSize);
    try {
      const results = await processor(batch.map((q) => q.item));
      batch.forEach((q, i) => q.resolve(results[i]));
    } catch (error) {
      batch.forEach((q) => q.reject(error instanceof Error ? error : new Error(String(error))));
    }

    if (queue.length >= batchSize) {
      processingTimer = setTimeout(processBatch, 0);
    } else {
      processingTimer = null;
    }
  };

  const scheduleProcessing = () => {
    if (!processingTimer) {
      processingTimer = setTimeout(processBatch, maxWait);
    }
  };

  return {
    add(item: T): Promise<R> {
      return new Promise((resolve, reject) => {
        queue.push({ item, resolve, reject });
        if (queue.length >= batchSize) {
          if (processingTimer) {
            clearTimeout(processingTimer);
          }
          processBatch();
        } else {
          scheduleProcessing();
        }
      });
    },
    async flush(): Promise<void> {
      if (processingTimer) {
        clearTimeout(processingTimer);
        processingTimer = null;
      }
      while (queue.length > 0) {
        await processBatch();
      }
    },
  };
}
