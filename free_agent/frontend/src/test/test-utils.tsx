import { renderHook, RenderHookResult } from '@testing-library/react';
import { useState, useEffect, useRef, useCallback, act } from 'react';

export interface MockIntersectionObserver {
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
  mockElements: Set<Element>;
}

export function createMockIntersectionObserver(): MockIntersectionObserver {
  const mockElements = new Set<Element>();

  return {
    observe: jest.fn((element: Element) => {
      mockElements.add(element);
    }),
    unobserve: jest.fn((element: Element) => {
      mockElements.delete(element);
    }),
    disconnect: jest.fn(() => {
      mockElements.clear();
    }),
    mockElements,
  };
}

export function mockIntersectionObserver(): void {
  const mock = createMockIntersectionObserver();

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation(() => mock),
  });
}

export interface MockResizeObserver {
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
  mockElements: Map<Element, DOMRect>;
}

export function createMockResizeObserver(): MockResizeObserver {
  const mockElements = new Map<Element, DOMRect>();

  return {
    observe: jest.fn((element: Element) => {
      mockElements.set(element, element.getBoundingClientRect());
    }),
    unobserve: jest.fn((element: Element) => {
      mockElements.delete(element);
    }),
    disconnect: jest.fn(() => {
      mockElements.clear();
    }),
    mockElements,
  };
}

export function mockResizeObserver(): void {
  const mock = createMockResizeObserver();

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation(() => mock),
  });
}

export function mockMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

export function mockLocalStorage(): void {
  const storage: Record<string, string> = {};

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    configurable: true,
    value: {
      getItem: jest.fn((key: string) => storage[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }),
      key: jest.fn((index: number) => Object.keys(storage)[index] || null),
      get length() {
        return Object.keys(storage).length;
      },
    },
  });
}

export function mockSessionStorage(): void {
  const storage: Record<string, string> = {};

  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    configurable: true,
    value: {
      getItem: jest.fn((key: string) => storage[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }),
      key: jest.fn((index: number) => Object.keys(storage)[index] || null),
      get length() {
        return Object.keys(storage).length;
      },
    },
  });
}

export function mockGeolocation(): void {
  Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success: GeolocationPositionCallback) => {
        success({
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            altitude: 0,
            accuracy: 10,
            altitudeAccuracy: 10,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      }),
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    },
  });
}

export function mockMediaDevices(): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: jest.fn(() => Promise.resolve({
        getTracks: () => [],
        stop: () => {},
      })),
      getDisplayMedia: jest.fn(() => Promise.resolve({
        getTracks: () => [],
        stop: () => {},
      })),
      enumerateDevices: jest.fn(() => Promise.resolve([])),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    },
  });
}

export function mockNotifications(): void {
  Object.defineProperty(window, 'Notification', {
    writable: true,
    configurable: true,
    value: {
      permission: 'default',
      requestPermission: jest.fn(() => Promise.resolve('granted')),
      close: jest.fn(),
    },
  });
}

export function mockClipboard(): void {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    configurable: true,
    value: {
      readText: jest.fn(() => Promise.resolve('')),
      writeText: jest.fn(() => Promise.resolve()),
      read: jest.fn(() => Promise.resolve([])),
      write: jest.fn(() => Promise.resolve()),
    },
  });
}

export function mockFetch(): void {
  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    redirect: 'follow',
    cache: 'default',
    credentials: 'same-origin',
    integrity: '',
    mode: 'cors',
    referrer: '',
    referrerPolicy: '',
    signal: null as AbortSignal | null,
  };

  global.fetch = jest.fn(() => Promise.resolve(mockResponse as unknown as Response));
}

export function setupAllMocks(): void {
  mockIntersectionObserver();
  mockResizeObserver();
  mockMatchMedia();
  mockLocalStorage();
  mockSessionStorage();
  mockGeolocation();
  mockMediaDevices();
  mockNotifications();
  mockClipboard();
  mockFetch();
}

export function cleanupAllMocks(): void {
  jest.clearAllMocks();
}

export function createMockEvent(
  type: string,
  options: EventInit = {}
): Event {
  return new Event(type, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? true,
    composed: options.composed ?? true,
    ...options,
  } as EventInit);
}

export function createMockKeyboardEvent(
  type: string,
  options: KeyboardEventInit = {}
): KeyboardEvent {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  } as KeyboardEventInit);
}

export function createMockMouseEvent(
  type: string,
  options: MouseEventInit = {}
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  } as MouseEventInit);
}

export function createMockTouchEvent(
  type: string,
  options: TouchEventInit = {}
): TouchEvent {
  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: [],
    targetTouches: [],
    changedTouches: [],
    ...options,
  } as TouchEventInit);
}

export async function waitFor(
  callback: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 1000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await callback();
    if (result) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('waitFor timed out');
}

export async function waitForAsync(
  callback: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  return waitFor(callback, options);
}

export function createMockFile(
  name: string,
  size: number,
  type: string = 'text/plain'
): File {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type });
  
  return new File([blob], name, { type });
}

export function createMockFormData(): FormData {
  const formData = new FormData();
  
  formData.append = jest.fn((key: string, value: string | Blob) => {
    return formData;
  });
  
  formData.delete = jest.fn((key: string) => {
    return formData;
  });
  
  formData.get = jest.fn((key: string) => {
    return null;
  });
  
  formData.getAll = jest.fn((key: string) => {
    return [];
  });
  
  formData.has = jest.fn((key: string) => {
    return false;
  });
  
  formData.set = jest.fn((key: string, value: string | Blob) => {
    return formData;
  });
  
  formData.forEach = jest.fn((callback: (value: string | Blob, key: string, parent: FormData) => void) => {
    return;
  });
  
  formData.keys = jest.fn(function* () {
    return;
  });
  
  formData.values = jest.fn(function* () {
    return;
  });
  
  formData.entries = jest.fn(function* () {
    return;
  });
  
  Object.defineProperty(formData, 'length', {
    value: 0,
    writable: false,
  });

  return formData;
}

export function createMockURL(): void {
  const mockUrl = 'http://localhost:3000/test';
  
  global.URL.createObjectURL = jest.fn(() => mockUrl);
  global.URL.revokeObjectURL = jest.fn();
}

export function createMockPerformance(): void {
  const performanceData: PerformanceEntry[] = [];
  
  Object.defineProperty(window, 'performance', {
    writable: true,
    configurable: true,
    value: {
      now: jest.fn(() => Date.now()),
      mark: jest.fn((name: string) => {
        performanceData.push({
          name,
          entryType: 'mark',
          startTime: Date.now(),
          duration: 0,
          toJSON: () => ({}),
        } as PerformanceEntry);
      }),
      measure: jest.fn((name: string, startMark?: string, endMark?: string) => {
        performanceData.push({
          name,
          entryType: 'measure',
          startTime: Date.now(),
          duration: 0,
          toJSON: () => ({}),
        } as PerformanceEntry);
      }),
      getEntriesByType: jest.fn((type: string) => {
        return performanceData.filter((entry) => entry.entryType === type);
      }),
      getEntriesByName: jest.fn((name: string) => {
        return performanceData.filter((entry) => entry.name === name);
      }),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      navigation: {
        type: 0,
        redirectCount: 0,
        timing: {
          navigationStart: Date.now() - 1000,
          unloadEventStart: 0,
          unloadEventEnd: 0,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: 0,
          domainLookupStart: 0,
          domainLookupEnd: 0,
          connectStart: 0,
          connectEnd: 0,
          secureConnectionStart: 0,
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
          domLoading: 0,
          domInteractive: 0,
          domContentLoadedEventStart: 0,
          domContentLoadedEventEnd: 0,
          domComplete: 0,
          loadEventStart: 0,
          loadEventEnd: 0,
        },
      },
      timing: {
        navigationStart: Date.now() - 1000,
      },
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 40000000,
      },
      eventCounts: new Map(),
    },
  });
}

export function mockAnimationFrame(): void {
  let rafId = 0;
  const callbacks = new Map<number, (time: number) => void>();

  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: (time: number) => number) => {
    rafId++;
    callbacks.set(rafId, callback);
    return rafId;
  });

  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
    callbacks.delete(id);
  });

  (window as Window & { advanceAnimationFrames?: (ms: number) => void }).advanceAnimationFrames = (ms: number) => {
    callbacks.forEach((callback) => {
      callback(Date.now() + ms);
    });
  };
}

export function createMockWebSocket(): void {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    bufferedAmount = 0;
    extensions = '';
    binaryType: 'blob' | 'arraybuffer' = 'blob';
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    protocol = '';
    url: string;

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }, 0);
    }

    close(code?: number, reason?: string): void {
      this.readyState = MockWebSocket.CLOSING;
      setTimeout(() => {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
          this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
        }
      }, 0);
    }

    send(data: string | ArrayBuffer | Blob): void {
      if (this.readyState !== MockWebSocket.OPEN) {
        throw new Error('WebSocket is not open');
      }
    }

    addEventListener(type: string, listener: EventListener): void {
      switch (type) {
        case 'open':
          this.onopen = listener as (event: Event) => void;
          break;
        case 'close':
          this.onclose = listener as (event: CloseEvent) => void;
          break;
        case 'error':
          this.onerror = listener as (event: Event) => void;
          break;
        case 'message':
          this.onmessage = listener as (event: MessageEvent) => void;
          break;
      }
    }

    removeEventListener(type: string, listener: EventListener): void {
      if (type === 'open') this.onopen = null;
      if (type === 'close') this.onclose = null;
      if (type === 'error') this.onerror = null;
      if (type === 'message') this.onmessage = null;
    }

    dispatchEvent(event: Event): boolean {
      return true;
    }
  }

  Object.defineProperty(window, 'WebSocket', {
    writable: true,
    configurable: true,
    value: MockWebSocket,
  });
}

export function mockWindowProperties(): void {
  Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });
  Object.defineProperty(window, 'outerWidth', { writable: true, value: 1024 });
  Object.defineProperty(window, 'outerHeight', { writable: true, value: 768 });
  Object.defineProperty(window, 'devicePixelRatio', { writable: true, value: 1 });
  Object.defineProperty(window, 'location', { writable: true, value: { href: 'http://localhost:3000' } });
  Object.defineProperty(window, 'navigator', { writable: true, value: { userAgent: 'test' } });
}

export const testUtils = {
  setupAllMocks,
  cleanupAllMocks,
  createMockEvent,
  createMockKeyboardEvent,
  createMockMouseEvent,
  createMockTouchEvent,
  createMockFile,
  createMockFormData,
  waitFor,
  waitForAsync,
  mockIntersectionObserver,
  mockResizeObserver,
  mockMatchMedia,
  mockLocalStorage,
  mockSessionStorage,
  mockGeolocation,
  mockMediaDevices,
  mockNotifications,
  mockClipboard,
  mockFetch,
  mockAnimationFrame,
  mockWebSocket: createMockWebSocket,
  mockWindowProperties,
  createMockURL,
  createMockPerformance,
};

export default testUtils;
