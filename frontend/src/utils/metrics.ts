export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MemoryMetric {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface NetworkMetric {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  cached: boolean;
  timestamp: number;
}

export interface CustomEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

export type MetricType = 'timing' | 'counter' | 'gauge' | 'histogram';

export interface MetricDefinition {
  name: string;
  type: MetricType;
  unit?: string;
  description?: string;
  tags?: string[];
}

export class MetricsCollector {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private networkMetrics: NetworkMetric[] = [];
  private customEvents: CustomEvent[] = [];
  private memorySnapshots: MemoryMetric[] = [];
  private maxMetricsPerType: number = 1000;
  private subscribers: Set<(metric: PerformanceMetric) => void> = new Set();
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    if (enabled && typeof window !== 'undefined') {
      this.setupPerformanceObserver();
      this.startMemoryMonitoring();
      this.setupNetworkMonitoring();
    }
  }

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordWebVital(entry as PerformanceEntry & { rating?: string });
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'paint', 'longtask'] });
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  private recordWebVital(entry: PerformanceEntry & { rating?: string; size?: number; identifier?: string }): void {
    const metric: PerformanceMetric = {
      name: entry.entryType,
      value: entry.duration || (entry as unknown as { startTime: number }).startTime,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        name: entry.name,
        ...(entry.rating && { rating: entry.rating }),
      },
    };

    this.record(metric);
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.captureMemorySnapshot();
    }, 30000);
  }

  private captureMemorySnapshot(): void {
    if (typeof performance === 'undefined') return;

    const memory = (performance as Performance & { memory?: MemoryMetric }).memory;

    if (memory) {
      const snapshot: MemoryMetric = {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };

      this.memorySnapshots.push(snapshot);

      if (this.memorySnapshots.length > this.maxMetricsPerType) {
        this.memorySnapshots.shift();
      }

      this.record({
        name: 'memory',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        timestamp: Date.now(),
        tags: {
          total: String(memory.totalJSHeapSize),
          limit: String(memory.jsHeapSizeLimit),
        },
      });
    }
  }

  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function(...args) {
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method || (input instanceof Request ? input.method : 'GET');

      const startTime = performance.now();

      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;

        const metric: NetworkMetric = {
          url,
          method,
          status: response.status,
          duration,
          size: parseInt(response.headers.get('content-length') || '0'),
          cached: response.headers.get('x-cache') === 'HIT',
          timestamp: Date.now(),
        };

        self.recordNetworkMetric(metric);

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        self.recordNetworkMetric({
          url,
          method,
          status: 0,
          duration,
          size: 0,
          cached: false,
          timestamp: Date.now(),
        });

        throw error;
      }
    };
  }

  record(metric: PerformanceMetric): void {
    if (!this.enabled) return;

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metrics = this.metrics.get(metric.name)!;
    metrics.push(metric);

    if (metrics.length > this.maxMetricsPerType) {
      metrics.shift();
    }

    this.subscribers.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Error in metric subscriber:', error);
      }
    });
  }

  recordMetric(name: string, value: number, unit: string = '', tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    });
  }

  recordNetworkMetric(metric: NetworkMetric): void {
    this.networkMetrics.push(metric);

    if (this.networkMetrics.length > this.maxMetricsPerType) {
      this.networkMetrics.shift();
    }

    this.record({
      name: 'network',
      value: metric.duration,
      unit: 'ms',
      timestamp: metric.timestamp,
      tags: {
        url: metric.url,
        method: metric.method,
        status: String(metric.status),
        cached: String(metric.cached),
      },
    });
  }

  recordEvent(name: string, properties?: Record<string, unknown>): void {
    this.customEvents.push({
      name,
      properties,
      timestamp: Date.now(),
    });

    if (this.customEvents.length > this.maxMetricsPerType) {
      this.customEvents.shift();
    }

    this.record({
      name: 'event',
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      tags: { event: name },
    });
  }

  measure(name: string, fn: () => void): void {
    const startTime = performance.now();
    fn();
    const duration = performance.now() - startTime;

    this.recordMetric(name, duration, 'ms');
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', { status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', { status: 'error' });
      throw error;
    }
  }

  startTimer(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms');
    };
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }

    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }

    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  getNetworkMetrics(url?: string): NetworkMetric[] {
    if (url) {
      return this.networkMetrics.filter(m => m.url === url);
    }
    return [...this.networkMetrics];
  }

  getMemorySnapshots(): MemoryMetric[] {
    return [...this.memorySnapshots];
  }

  getCustomEvents(name?: string): CustomEvent[] {
    if (name) {
      return this.customEvents.filter(e => e.name === name);
    }
    return [...this.customEvents];
  }

  getAverageMetric(name: string, windowMs?: number): number | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    let filteredMetrics = metrics;
    if (windowMs) {
      const cutoff = Date.now() - windowMs;
      filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
    }

    if (filteredMetrics.length === 0) return null;

    const sum = filteredMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / filteredMetrics.length;
  }

  getPercentile(name: string, percentile: number): number | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index];
  }

  getSummary(name?: string): Record<string, unknown> {
    const metrics = name ? this.getMetrics(name) : this.getMetrics();

    if (metrics.length === 0) {
      return {
        count: 0,
        avg: null,
        min: null,
        max: null,
        p50: null,
        p90: null,
        p95: null,
        p99: null,
      };
    }

    const values = metrics.map(m => m.value);
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
      this.networkMetrics = [];
      this.customEvents = [];
    }
  }

  subscribe(callback: (metric: PerformanceMetric) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  exportMetrics(): string {
    const data = {
      metrics: Object.fromEntries(this.metrics),
      networkMetrics: this.networkMetrics,
      customEvents: this.customEvents,
      memorySnapshots: this.memorySnapshots,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  importMetrics(json: string): void {
    try {
      const data = JSON.parse(json);

      if (data.metrics) {
        for (const [name, metrics] of Object.entries(data.metrics)) {
          this.metrics.set(name, metrics as PerformanceMetric[]);
        }
      }

      if (data.networkMetrics) {
        this.networkMetrics = data.networkMetrics;
      }

      if (data.customEvents) {
        this.customEvents = data.customEvents;
      }

      if (data.memorySnapshots) {
        this.memorySnapshots = data.memorySnapshots;
      }
    } catch (error) {
      console.error('Failed to import metrics:', error);
    }
  }
}

export class ErrorTracker {
  private errors: Array<{
    message: string;
    stack?: string;
    name: string;
    timestamp: number;
    context?: Record<string, unknown>;
  }> = [];
  private maxErrors: number = 100;
  private handlers: Array<(error: Error) => void> = [];
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    if (enabled && typeof window !== 'undefined') {
      this.setupGlobalHandlers();
    }
  }

  private setupGlobalHandlers(): void {
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.trackError(error, {
        type: 'unhandledrejection',
      });
    });
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const errorEntry = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: Date.now(),
      context,
    };

    this.errors.push(errorEntry);

    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    this.handlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });

    if (typeof console !== 'undefined') {
      console.error(`[ErrorTracker] ${error.name}: ${error.message}`, error.stack);
    }
  }

  onError(handler: (error: Error) => void): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index !== -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  getErrors(): Array<{
    message: string;
    stack?: string;
    name: string;
    timestamp: number;
    context?: Record<string, unknown>;
  }> {
    return [...this.errors];
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  getErrorRate(windowMs: number = 60000): number {
    const cutoff = Date.now() - windowMs;
    const recentErrors = this.errors.filter(e => e.timestamp >= cutoff);
    return recentErrors.length / (windowMs / 1000);
  }

  clearErrors(): void {
    this.errors = [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  exportErrors(): string {
    return JSON.stringify({
      errors: this.errors,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

export class PerformanceMonitor {
  private metrics: MetricsCollector;
  private errors: ErrorTracker;
  private fps: number = 0;
  private lastFrameTime: number = 0;
  private rafId?: number;
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor(enabled: boolean = true) {
    this.metrics = new MetricsCollector(enabled);
    this.errors = new ErrorTracker(enabled);

    if (enabled && typeof window !== 'undefined') {
      this.startFPSMonitoring();
      this.setupNavigationTiming();
    }
  }

  private startFPSMonitoring(): void {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;

      this.fps = Math.round(1000 / delta);
      this.metrics.recordMetric('fps', this.fps, 'fps');

      this.rafId = requestAnimationFrame(measureFPS);
    };

    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(measureFPS);
  }

  private setupNavigationTiming(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('responseStart' in entry) {
            const navigation = entry as PerformanceNavigationTiming;
            this.metrics.recordMetric('navigation', navigation.responseStart - navigation.requestStart, 'ms', {
              type: navigation.type,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    } catch (error) {
      console.warn('Failed to setup navigation timing:', error);
    }
  }

  getMetrics(): MetricsCollector {
    return this.metrics;
  }

  getErrorTracker(): ErrorTracker {
    return this.errors;
  }

  getFPS(): number {
    return this.fps;
  }

  measureRender(name: string, fn: () => void): void {
    this.metrics.measure(name, fn);
  }

  async measureRenderAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return this.metrics.measureAsync(name, fn);
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    this.metrics.recordEvent(name, properties);
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    this.errors.trackError(error, context);
  }

  getMemoryUsage(): MemoryMetric | null {
    const snapshots = this.metrics.getMemorySnapshots();
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  getNetworkSummary(): Record<string, unknown> {
    const metrics = this.metrics.getNetworkMetrics();
    
    if (metrics.length === 0) {
      return { count: 0, avgDuration: null, successRate: null };
    }

    const successful = metrics.filter(m => m.status >= 200 && m.status < 400);
    
    return {
      count: metrics.length,
      avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      successRate: successful.length / metrics.length,
      cacheHitRate: metrics.filter(m => m.cached).length / metrics.length,
    };
  }

  getPerformanceScore(): number {
    const summary = this.metrics.getSummary('memory');
    const avgMemory = summary.avg as number | null;
    const fps = this.fps;

    if (avgMemory === null) {
      return fps > 55 ? 100 : fps > 30 ? 50 : 0;
    }

    const memoryUsageRatio = avgMemory / (512 * 1024 * 1024);
    const fpsScore = Math.min(100, fps * 2);
    const memoryScore = Math.max(0, 100 - memoryUsageRatio * 100);

    return Math.round((fpsScore + memoryScore) / 2);
  }

  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}

export const metricsCollector = new MetricsCollector();
export const errorTracker = new ErrorTracker();
export const performanceMonitor = new PerformanceMonitor();

export function reportWebVitals(): void {
  if (typeof window === 'undefined') return;

  metricsCollector.subscribe((metric) => {
    if (metric.name === 'navigation') {
      console.log(`Navigation timing: ${metric.value}ms`);
    }
  });
}

export function measureCLS(callback?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const metric = {
          name: 'CLS',
          value: (entry as unknown as { value: number }).value,
          unit: '',
          timestamp: Date.now(),
        };
        
        metricsCollector.record(metric);
        callback?.(metric);
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    console.warn('Failed to measure CLS:', error);
  }
}

export function measureLCP(callback?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { element?: Element };

      const metric = {
        name: 'LCP',
        value: lastEntry.startTime,
        unit: 'ms',
        timestamp: Date.now(),
      };

      metricsCollector.record(metric);
      callback?.(metric);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    console.warn('Failed to measure LCP:', error);
  }
}

export function measureFID(callback?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const metric = {
          name: 'FID',
          value: (entry as unknown as { processingStart: number; startTime: number }).processingStart - entry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
        };

        metricsCollector.record(metric);
        callback?.(metric);
      }
    });

    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    console.warn('Failed to measure FID:', error);
  }
}

export function measureTTFB(callback?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined') return {
    stop: () => {},
  };

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const metric = {
          name: 'TTFB',
          value: (entry as PerformanceNavigationTiming).responseStart,
          unit: 'ms',
          timestamp: Date.now(),
        };

        metricsCollector.record(metric);
        callback?.(metric);
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    return {
      stop: () => observer.disconnect(),
    };
  } catch (error) {
    console.warn('Failed to measure TTFB:', error);
    return { stop: () => {} };
  }
}
