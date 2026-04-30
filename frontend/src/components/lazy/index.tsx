import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';

export interface LazyOptions {
  ssr?: boolean;
  fallback?: ReactNode;
}

export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
) {
  const { ssr = false, fallback = null } = options;
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    if (ssr) {
      return <LazyComponent {...props} />;
    }
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

export const LazyChat = createLazyComponent(() => import('./pages/Chat'), {
  fallback: <div className="loading-skeleton" style={{ height: '100%' }} />,
});

export const LazySettings = createLazyComponent(() => import('./pages/Settings'), {
  fallback: <div className="loading-skeleton" style={{ height: '100%' }} />,
});

export const LazyHistory = createLazyComponent(() => import('./pages/History'), {
  fallback: <div className="loading-skeleton" style={{ height: '100%' }} />,
});

export const LazyAgents = createLazyComponent(() => import('./pages/Agents'), {
  fallback: <div className="loading-skeleton" style={{ height: '100%' }} />,
});

export const LazyTools = createLazyComponent(() => import('./pages/Tools'), {
  fallback: <div className="loading-skeleton" style={{ height: '100%' }} />,
});

export const LazyMCP = createLazyComponent(() => import('./pages/MCP'), {
  fallback: <div className="loading-skeleton" style={{ height: '100%' }} />,
});

export const LazyCodeEditor = createLazyComponent(() => import('./components/CodeEditor'), {
  fallback: <div className="loading-skeleton" style={{ height: '400px' }} />,
});

export const LazyMarkdownRenderer = createLazyComponent(() => import('./components/MarkdownRenderer'), {
  fallback: <div className="loading-skeleton" style={{ height: '100px' }} />,
});

export const LazyImageViewer = createLazyComponent(() => import('./components/ImageViewer'), {
  fallback: <div className="loading-skeleton" style={{ height: '300px' }} />,
});

export const LazyFileTree = createLazyComponent(() => import('./components/FileTree'), {
  fallback: <div className="loading-skeleton" style={{ height: '200px' }} />,
});

export const LazyTerminal = createLazyComponent(() => import('./components/Terminal'), {
  fallback: <div className="loading-skeleton" style={{ height: '200px' }} />,
});

export const LazyChart = createLazyComponent(() => import('./components/Chart'), {
  fallback: <div className="loading-skeleton" style={{ height: '300px' }} />,
});

export const LazyPDFViewer = createLazyComponent(() => import('./components/PDFViewer'), {
  fallback: <div className="loading-skeleton" style={{ height: '500px' }} />,
});

export const LazyDataTable = createLazyComponent(() => import('./components/DataTable'), {
  fallback: <div className="loading-skeleton" style={{ height: '400px' }} />,
});

export const LazyAudioPlayer = createLazyComponent(() => import('./components/AudioPlayer'), {
  fallback: <div className="loading-skeleton" style={{ height: '60px' }} />,
});

export const LazyVideoPlayer = createLazyComponent(() => import('./components/VideoPlayer'), {
  fallback: <div className="loading-skeleton" style={{ height: '400px' }} />,
});

export interface PreloadOptions {
  priority?: 'high' | 'low';
  timeout?: number;
}

export function preloadComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: PreloadOptions = {}
): void {
  const { priority = 'low', timeout = 5000 } = options;
  
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = timeout > 0 ? setTimeout(() => controller?.abort(), timeout) : null;
  
  importFn().then(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }).catch(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
  
  if (priority === 'high' && typeof window !== 'undefined') {
    requestIdleCallback?.(() => {
      importFn().catch(() => {});
    });
  }
}

export function usePreloadComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: PreloadOptions = {}
) {
  React.useEffect(() => {
    preloadComponent(importFn, options);
  }, [importFn, options.priority, options.timeout]);
}

export interface RouteBasedPreloaderProps {
  currentRoute: string;
  routes: Record<string, () => Promise<unknown>>;
  preloadDelay?: number;
}

export function useRouteBasedPreloader({ currentRoute, routes, preloadDelay = 100 }: RouteBasedPreloaderProps) {
  React.useEffect(() => {
    const route = routes[currentRoute];
    if (route) {
      const timeoutId = setTimeout(() => {
        route();
      }, preloadDelay);
      return () => clearTimeout(timeoutId);
    }
  }, [currentRoute, routes, preloadDelay]);
}

export const SuspenseLoader = {
  Chat: LazyChat,
  Settings: LazySettings,
  History: LazyHistory,
  Agents: LazyAgents,
  Tools: LazyTools,
  MCP: LazyMCP,
  CodeEditor: LazyCodeEditor,
  MarkdownRenderer: LazyMarkdownRenderer,
  ImageViewer: LazyImageViewer,
  FileTree: LazyFileTree,
  Terminal: LazyTerminal,
  Chart: LazyChart,
  PDFViewer: LazyPDFViewer,
  DataTable: LazyDataTable,
  AudioPlayer: LazyAudioPlayer,
  VideoPlayer: LazyVideoPlayer,
};

export default SuspenseLoader;
