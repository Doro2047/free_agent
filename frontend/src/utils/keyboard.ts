import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  enabled?: boolean;
  description?: string;
  category?: string;
}

export interface ShortcutHandler {
  id: string;
  shortcut: KeyboardShortcut;
  handler: (event: KeyboardEvent) => void;
  priority?: number;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: ShortcutHandler[];
}

export class KeyboardShortcutRegistry {
  private shortcuts: Map<string, ShortcutHandler[]> = new Map();
  private enabled: boolean = true;
  private globalHandler: ((event: KeyboardEvent) => void) | null = null;

  private generateShortcutId(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.meta) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  register(
    id: string,
    shortcut: KeyboardShortcut,
    handler: (event: KeyboardEvent) => void,
    priority: number = 0
  ): () => void {
    const shortcutId = this.generateShortcutId(shortcut);

    if (!this.shortcuts.has(shortcutId)) {
      this.shortcuts.set(shortcutId, []);
    }

    const handlers = this.shortcuts.get(shortcutId)!;
    const existing = handlers.find(h => h.id === id);

    if (existing) {
      existing.shortcut = shortcut;
      existing.handler = handler;
      existing.priority = priority;
    } else {
      handlers.push({ id, shortcut, handler, priority });
      handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    return () => this.unregister(id, shortcut);
  }

  unregister(id: string, shortcut: KeyboardShortcut): void {
    const shortcutId = this.generateShortcutId(shortcut);
    const handlers = this.shortcuts.get(shortcutId);

    if (handlers) {
      const index = handlers.findIndex(h => h.id === id);
      if (index !== -1) {
        handlers.splice(index, 1);
      }

      if (handlers.length === 0) {
        this.shortcuts.delete(shortcutId);
      }
    }
  }

  unregisterAll(id: string): void {
    for (const [shortcutId, handlers] of this.shortcuts.entries()) {
      const filtered = handlers.filter(h => h.id !== id);
      if (filtered.length === 0) {
        this.shortcuts.delete(shortcutId);
      } else if (filtered.length !== handlers.length) {
        this.shortcuts.set(shortcutId, filtered);
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    const activeElement = document.activeElement;
    const isEditable = activeElement instanceof HTMLInputElement ||
                      activeElement instanceof HTMLTextAreaElement ||
                      activeElement instanceof HTMLSelectElement ||
                      (activeElement as HTMLElement)?.isContentEditable;

    if (isEditable && !event.ctrlKey && !event.metaKey && !event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    const shortcutId = this.generateShortcutId({
      key,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    });

    const handlers = this.shortcuts.get(shortcutId);

    if (handlers && handlers.length > 0) {
      event.preventDefault();
      event.stopPropagation();

      for (const { handler, shortcut } of handlers) {
        if (shortcut.enabled !== false) {
          try {
            handler(event);
          } catch (error) {
            console.error(`Error in keyboard shortcut handler ${shortcutId}:`, error);
          }
        }
      }
    }
  }

  getAllShortcuts(): ShortcutGroup[] {
    const groups = new Map<string, ShortcutHandler[]>();

    for (const handlers of this.shortcuts.values()) {
      for (const handler of handlers) {
        const category = handler.shortcut.category || 'General';
        if (!groups.has(category)) {
          groups.set(category, []);
        }
        groups.get(category)!.push(handler);
      }
    }

    return Array.from(groups.entries()).map(([name, shortcuts]) => ({
      name,
      shortcuts,
    }));
  }

  getShortcutsByCategory(category: string): ShortcutHandler[] {
    const all = this.getAllShortcuts();
    const group = all.find(g => g.name === category);
    return group?.shortcuts || [];
  }

  hasConflict(shortcut: KeyboardShortcut, excludeId?: string): ShortcutHandler | null {
    const shortcutId = this.generateShortcutId(shortcut);
    const handlers = this.shortcuts.get(shortcutId);

    if (handlers) {
      for (const handler of handlers) {
        if (!excludeId || handler.id !== excludeId) {
          return handler;
        }
      }
    }

    return null;
  }

  findConflicts(shortcut: KeyboardShortcut): ShortcutHandler[] {
    const conflicts: ShortcutHandler[] = [];
    const shortcutId = this.generateShortcutId(shortcut);

    for (const [id, handlers] of this.shortcuts.entries()) {
      if (id !== shortcutId) continue;

      for (const handler of handlers) {
        if (
          handler.shortcut.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!handler.shortcut.ctrl === !!shortcut.ctrl &&
          !!handler.shortcut.alt === !!shortcut.alt &&
          !!handler.shortcut.shift === !!shortcut.shift &&
          !!handler.shortcut.meta === !!shortcut.meta
        ) {
          conflicts.push(handler);
        }
      }
    }

    return conflicts;
  }

  exportShortcuts(): Record<string, unknown> {
    const shortcuts: Record<string, unknown> = {};

    for (const [shortcutId, handlers] of this.shortcuts.entries()) {
      shortcuts[shortcutId] = handlers.map(h => ({
        id: h.id,
        shortcut: h.shortcut,
        priority: h.priority,
      }));
    }

    return shortcuts;
  }

  importShortcuts(data: Record<string, unknown>): void {
    this.shortcuts.clear();

    for (const [shortcutId, handlers] of Object.entries(data)) {
      const parsed = handlers as Array<{
        id: string;
        shortcut: KeyboardShortcut;
        handler: (event: KeyboardEvent) => void;
        priority?: number;
      }>;

      for (const { id, shortcut, handler, priority } of parsed) {
        this.register(id, shortcut, handler, priority);
      }
    }
  }

  clear(): void {
    this.shortcuts.clear();
  }

  getShortcutCount(): number {
    let count = 0;
    for (const handlers of this.shortcuts.values()) {
      count += handlers.length;
    }
    return count;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const handlers of this.shortcuts.values()) {
      for (const handler of handlers) {
        if (handler.shortcut.category) {
          categories.add(handler.shortcut.category);
        }
      }
    }
    return Array.from(categories);
  }
}

export const globalShortcutRegistry = new KeyboardShortcutRegistry();

export function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  handler: (event: KeyboardEvent) => void,
  dependencies: unknown[] = [],
  options: { priority?: number; id?: string } = {}
): void {
  const idRef = useRef(options.id || `shortcut-${Date.now()}-${Math.random()}`);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const id = idRef.current;
    const wrappedHandler = (event: KeyboardEvent) => {
      handlerRef.current(event);
    };

    globalShortcutRegistry.register(
      id,
      shortcut,
      wrappedHandler,
      options.priority
    );

    return () => {
      globalShortcutRegistry.unregister(id, shortcut);
    };
  }, [shortcut, options.priority]);
}

export function useKeyboardShortcuts(
  shortcuts: Array<{
    shortcut: KeyboardShortcut;
    handler: (event: KeyboardEvent) => void;
  }>,
  _dependencies: unknown[] = []
): void {
  useEffect(() => {
    const cleanupFns: (() => void)[] = [];
    
    shortcuts.forEach(({ shortcut, handler }) => {
      const cleanup = registerShortcut(shortcut, handler);
      cleanupFns.push(cleanup);
    });
    
    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, [shortcuts]);
}

export function useShortcutManager() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [shortcuts, setShortcuts] = useState<ShortcutGroup[]>([]);

  useEffect(() => {
    setShortcuts(globalShortcutRegistry.getAllShortcuts());

    const interval = setInterval(() => {
      setShortcuts(globalShortcutRegistry.getAllShortcuts());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleEnabled = useCallback(() => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    globalShortcutRegistry.setEnabled(newState);
  }, [isEnabled]);

  const exportShortcuts = useCallback(() => {
    return globalShortcutRegistry.exportShortcuts();
  }, []);

  const importShortcuts = useCallback((data: Record<string, unknown>) => {
    globalShortcutRegistry.importShortcuts(data);
    setShortcuts(globalShortcutRegistry.getAllShortcuts());
  }, []);

  const clearAll = useCallback(() => {
    globalShortcutRegistry.clear();
    setShortcuts([]);
  }, []);

  return {
    isEnabled,
    shortcuts,
    toggleEnabled,
    exportShortcuts,
    importShortcuts,
    clearAll,
    categories: globalShortcutRegistry.getCategories(),
  };
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')) {
    if (shortcut.meta) parts.push('⌘');
    if (shortcut.ctrl) parts.push('⌃');
    if (shortcut.alt) parts.push('⌥');
    if (shortcut.shift) parts.push('⇧');
  } else {
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.meta) parts.push('Meta');
  }

  const key = shortcut.key.toUpperCase();
  const specialKeys: Record<string, string> = {
    ' ': 'Space',
    'enter': 'Enter',
    'escape': 'Esc',
    'tab': 'Tab',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    'home': 'Home',
    'end': 'End',
    'pageup': 'Page Up',
    'pagedown': 'Page Down',
  };

  parts.push(specialKeys[shortcut.key.toLowerCase()] || key);

  return parts.join('+');
}

export const COMMON_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true, category: 'File', description: '保存' },
  COPY: { key: 'c', ctrl: true, category: 'Edit', description: '复制' },
  PASTE: { key: 'v', ctrl: true, category: 'Edit', description: '粘贴' },
  CUT: { key: 'x', ctrl: true, category: 'Edit', description: '剪切' },
  UNDO: { key: 'z', ctrl: true, category: 'Edit', description: '撤销' },
  REDO: { key: 'z', ctrl: true, shift: true, category: 'Edit', description: '重做' },
  SELECT_ALL: { key: 'a', ctrl: true, category: 'Edit', description: '全选' },
  FIND: { key: 'f', ctrl: true, category: 'Search', description: '查找' },
  REPLACE: { key: 'h', ctrl: true, category: 'Search', description: '替换' },
  NEW_FILE: { key: 'n', ctrl: true, category: 'File', description: '新建文件' },
  OPEN_FILE: { key: 'o', ctrl: true, category: 'File', description: '打开文件' },
  CLOSE_FILE: { key: 'w', ctrl: true, category: 'File', description: '关闭文件' },
  QUIT: { key: 'q', ctrl: true, category: 'App', description: '退出' },
  SETTINGS: { key: ',', ctrl: true, category: 'App', description: '设置' },
  TOGGLE_SIDEBAR: { key: 'b', ctrl: true, category: 'View', description: '切换侧边栏' },
  TOGGLE_TERMINAL: { key: '`', ctrl: true, category: 'View', description: '切换终端' },
  FULLSCREEN: { key: 'f', ctrl: true, shift: true, category: 'View', description: '全屏' },
  ZOOM_IN: { key: '=', ctrl: true, category: 'View', description: '放大' },
  ZOOM_OUT: { key: '-', ctrl: true, category: 'View', description: '缩小' },
  RESET_ZOOM: { key: '0', ctrl: true, category: 'View', description: '重置缩放' },
  NEXT_TAB: { key: 'tab', ctrl: true, category: 'Tabs', description: '下一个标签' },
  PREV_TAB: { key: 'tab', ctrl: true, shift: true, category: 'Tabs', description: '上一个标签' },
  CLOSE_TAB: { key: 'w', ctrl: true, category: 'Tabs', description: '关闭标签' },
  NEW_TAB: { key: 't', ctrl: true, category: 'Tabs', description: '新建标签' },
  ESCAPE: { key: 'escape', category: 'General', description: '取消/关闭' },
  ENTER: { key: 'enter', category: 'General', description: '确认' },
  DELETE: { key: 'delete', category: 'General', description: '删除' },
  HELP: { key: '?', shift: true, category: 'Help', description: '帮助' },
} as const;

export type CommonShortcutKey = keyof typeof COMMON_SHORTCUTS;
