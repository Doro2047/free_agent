import { useEffect, useRef, useCallback } from 'react';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

export interface UseWebVitalsOptions {
  onLCP?: (metric: WebVitalsMetric) => void;
  onFID?: (metric: WebVitalsMetric) => void;
  onCLS?: (metric: WebVitalsMetric) => void;
  onTTFB?: (metric: WebVitalsMetric) => void;
  onFCP?: (metric: WebVitalsMetric) => void;
  onINP?: (metric: WebVitalsMetric) => void;
  reportToConsole?: boolean;
  reportToEndpoint?: string;
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    TTFB: [800, 1800],
    FCP: [1800, 3000],
    INP: [200, 500],
  };

  const [good, poor] = thresholds[name] || [0, Infinity];
  
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getNavigationType(): string {
  if (typeof document === 'undefined') return 'navigate';
  
  const entries = performance.getEntriesByType('navigation');
  if (entries.length === 0) return 'navigate';
  
  const navEntry = entries[0] as PerformanceNavigationTiming;
  switch (navEntry.type) {
    case 'navigate':
      return 'navigate';
    case 'reload':
      return 'reload';
    case 'back_forward':
      return 'back-forward';
    default:
      return 'navigate';
  }
}

export function useWebVitals(options: UseWebVitalsOptions = {}): void {
  const {
    onLCP,
    onFID,
    onCLS,
    onTTFB,
    onFCP,
    onINP,
    reportToConsole = false,
    reportToEndpoint,
  } = options;

  const reportedMetrics = useRef<Set<string>>(new Set());

  const reportMetric = useCallback(
    (metric: WebVitalsMetric) => {
      if (reportedMetrics.current.has(metric.name)) return;
      reportedMetrics.current.add(metric.name);

      if (reportToConsole) {
        console.log(
          `[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`
        );
      }

      if (reportToEndpoint && navigator.sendBeacon) {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
          url: window.location.href,
          timestamp: Date.now(),
        });
        navigator.sendBeacon(reportToEndpoint, body);
      }
    },
    [reportToConsole, reportToEndpoint]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    const measureLCP = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
          
          const metric: WebVitalsMetric = {
            name: 'LCP',
            value: lastEntry.startTime,
            rating: getRating('LCP', lastEntry.startTime),
            delta: lastEntry.startTime,
            id: generateId(),
            navigationType: getNavigationType(),
          };

          onLCP?.(metric);
          reportMetric(metric);
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        return () => observer.disconnect();
      } catch (e) {
        console.warn('[Web Vitals] LCP measurement failed:', e);
      }
    };

    const measureFID = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstEntry = entries[0] as PerformanceEventTiming;
          
          const metric: WebVitalsMetric = {
            name: 'FID',
            value: firstEntry.processingStart - firstEntry.startTime,
            rating: getRating('FID', firstEntry.processingStart - firstEntry.startTime),
            delta: firstEntry.processingStart - firstEntry.startTime,
            id: generateId(),
            navigationType: getNavigationType(),
          };

          onFID?.(metric);
          reportMetric(metric);
        });

        observer.observe({ type: 'first-input', buffered: true });
        return () => observer.disconnect();
      } catch (e) {
        console.warn('[Web Vitals] FID measurement failed:', e);
      }
    };

    const measureCLS = () => {
      try {
        let clsValue = 0;
        let sessionEntries: LayoutShift[] = [];
        let sessionValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as LayoutShift;
            if (!layoutShift.hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

              if (
                sessionValue &&
                layoutShift.startTime - lastSessionEntry.startTime < 1000 &&
                layoutShift.startTime - firstSessionEntry.startTime < 5000
              ) {
                sessionValue += layoutShift.value;
                sessionEntries.push(layoutShift);
              } else {
                sessionValue = layoutShift.value;
                sessionEntries = [layoutShift];
              }

              if (sessionValue > clsValue) {
                clsValue = sessionValue;
              }
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        const reportCLS = () => {
          const metric: WebVitalsMetric = {
            name: 'CLS',
            value: clsValue * 1000,
            rating: getRating('CLS', clsValue),
            delta: clsValue * 1000,
            id: generateId(),
            navigationType: getNavigationType(),
          };

          onCLS?.(metric);
          reportMetric(metric);
        };

        window.addEventListener('pagehide', reportCLS, { once: true });
        window.addEventListener('unload', reportCLS, { once: true });

        return () => {
          observer.disconnect();
          window.removeEventListener('pagehide', reportCLS);
          window.removeEventListener('unload', reportCLS);
        };
      } catch (e) {
        console.warn('[Web Vitals] CLS measurement failed:', e);
      }
    };

    const measureTTFB = () => {
      try {
        const entries = performance.getEntriesByType('navigation');
        if (entries.length > 0) {
          const navEntry = entries[0] as PerformanceNavigationTiming;
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          
          const metric: WebVitalsMetric = {
            name: 'TTFB',
            value: ttfb,
            rating: getRating('TTFB', ttfb),
            delta: ttfb,
            id: generateId(),
            navigationType: getNavigationType(),
          };

          onTTFB?.(metric);
          reportMetric(metric);
        }
      } catch (e) {
        console.warn('[Web Vitals] TTFB measurement failed:', e);
      }
    };

    const measureFCP = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(
            (entry) => entry.name === 'first-contentful-paint'
          );

          if (fcpEntry) {
            const metric: WebVitalsMetric = {
              name: 'FCP',
              value: fcpEntry.startTime,
              rating: getRating('FCP', fcpEntry.startTime),
              delta: fcpEntry.startTime,
              id: generateId(),
              navigationType: getNavigationType(),
            };

            onFCP?.(metric);
            reportMetric(metric);
          }
        });

        observer.observe({ type: 'paint', buffered: true });
        return () => observer.disconnect();
      } catch (e) {
        console.warn('[Web Vitals] FCP measurement failed:', e);
      }
    };

    const measureINP = () => {
      try {
        let inpValue = 0;
        const prevLatency = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const eventTiming = entry as PerformanceEventTiming;
            if (!eventTiming.interactionId) continue;

            const latency = eventTiming.processingEnd - eventTiming.startTime;
            
            if (latency > inpValue) {
              inpValue = latency;
            }
          }
        });

        observer.observe({ type: 'event', buffered: true });

        const reportINP = () => {
          if (inpValue > 0) {
            const metric: WebVitalsMetric = {
              name: 'INP',
              value: inpValue,
              rating: getRating('INP', inpValue),
              delta: inpValue - prevLatency,
              id: generateId(),
              navigationType: getNavigationType(),
            };

            onINP?.(metric);
            reportMetric(metric);
          }
        };

        window.addEventListener('pagehide', reportINP, { once: true });

        return () => {
          observer.disconnect();
          window.removeEventListener('pagehide', reportINP);
        };
      } catch (e) {
        console.warn('[Web Vitals] INP measurement failed:', e);
      }
    };

    const cleanups: Array<void | (() => void)> = [];

    if (onLCP || reportToConsole || reportToEndpoint) {
      cleanups.push(measureLCP());
    }
    if (onFID || reportToConsole || reportToEndpoint) {
      cleanups.push(measureFID());
    }
    if (onCLS || reportToConsole || reportToEndpoint) {
      cleanups.push(measureCLS());
    }
    if (onTTFB || reportToConsole || reportToEndpoint) {
      measureTTFB();
    }
    if (onFCP || reportToConsole || reportToEndpoint) {
      cleanups.push(measureFCP());
    }
    if (onINP || reportToConsole || reportToEndpoint) {
      cleanups.push(measureINP());
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup?.());
    };
  }, [onLCP, onFID, onCLS, onTTFB, onFCP, onINP, reportMetric]);
}

export function usePerformanceMonitoring(): {
  getMetrics: () => WebVitalsMetric[];
  mark: (name: string) => void;
  measure: (name: string, startMark: string, endMark?: string) => number | null;
} {
  const metricsRef = useRef<WebVitalsMetric[]>([]);

  const handleMetric = useCallback((metric: WebVitalsMetric) => {
    metricsRef.current.push(metric);
  }, []);

  useWebVitals({
    onLCP: handleMetric,
    onFID: handleMetric,
    onCLS: handleMetric,
    onTTFB: handleMetric,
    onFCP: handleMetric,
    onINP: handleMetric,
  });

  const mark = useCallback((name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }, []);

  const measure = useCallback(
    (name: string, startMark: string, endMark?: string): number | null => {
      if (typeof performance !== 'undefined' && performance.measure) {
        try {
          performance.measure(name, startMark, endMark);
          const entries = performance.getEntriesByName(name, 'measure');
          if (entries.length > 0) {
            return entries[0].duration;
          }
        } catch (e) {
          console.warn(`[Performance] Failed to measure ${name}:`, e);
        }
      }
      return null;
    },
    []
  );

  return {
    getMetrics: () => metricsRef.current,
    mark,
    measure,
  };
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  interactionId: number;
}

interface LargestContentfulPaint extends PerformanceEntry {
  startTime: number;
  size: number;
}
