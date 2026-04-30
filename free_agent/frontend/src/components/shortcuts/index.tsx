import React, { ReactNode, useEffect, useState } from 'react';

export interface ShortcutKey {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta' | 'cmd')[];
  display?: string;
}

export interface ShortcutDefinition {
  id: string;
  keys: ShortcutKey | ShortcutKey[];
  description: string;
  category?: string;
  action?: () => void;
}

export interface KeyboardShortcutItem {
  key: ShortcutKey;
  size?: 'sm' | 'md' | 'lg';
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDefinition[];
}

export function ShortcutKey({ key, size = 'md' }: KeyboardShortcutItem) {
  const sizeClasses = {
    sm: { padding: '2px 6px', fontSize: '10px', gap: '2px' },
    md: { padding: '4px 8px', fontSize: '12px', gap: '4px' },
    lg: { padding: '6px 10px', fontSize: '14px', gap: '6px' },
  };

  const style = sizeClasses[size];

  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: style.padding,
        fontSize: style.fontSize,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontStyle: 'normal',
        fontWeight: 500,
        color: '#374151',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        border: '1px solid #d1d5db',
        borderBottomWidth: '2px',
        boxShadow: 'inset 0 -1px 0 0 #d1d5db',
        whiteSpace: 'nowrap',
        gap: style.gap,
      }}
    >
      {key}
    </kbd>
  );
}

export interface ShortcutDisplayProps {
  shortcut: ShortcutDefinition;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export function ShortcutDisplay({
  shortcut,
  size = 'md',
  showDescription = true,
  layout = 'horizontal',
}: ShortcutDisplayProps) {
  const keys = Array.isArray(shortcut.keys) ? shortcut.keys : [shortcut.keys];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        alignItems: layout === 'vertical' ? 'flex-start' : 'center',
        gap: layout === 'vertical' ? '4px' : '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {keys.map((keyGroup, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span style={{ color: '#9ca3af', fontSize: '12px', margin: '0 2px' }}>+</span>
            )}
            {keyGroup.modifiers?.map((mod, modIdx) => (
              <React.Fragment key={modIdx}>
                <ShortcutKey key={formatModifier(mod)} size={size} />
                <span style={{ color: '#9ca3af', fontSize: '12px', marginRight: '2px' }}>+</span>
              </React.Fragment>
            ))}
            <ShortcutKey key={keyGroup.key} size={size} />
          </React.Fragment>
        ))}
      </div>
      {showDescription && (
        <span
          style={{
            fontSize: size === 'sm' ? '11px' : size === 'md' ? '13px' : '14px',
            color: '#6b7280',
          }}
        >
          {shortcut.description}
        </span>
      )}
    </div>
  );
}

function formatModifier(modifier: string): string {
  const map: Record<string, string> = {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Meta',
    cmd: '⌘',
  };
  return map[modifier] || modifier;
}

export interface ShortcutHintsProps {
  shortcuts: ShortcutDefinition[];
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  title?: string;
}

export function ShortcutHints({
  shortcuts,
  size = 'md',
  showDescription = true,
  title,
}: ShortcutHintsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px',
          }}
        >
          {title}
        </div>
      )}
      {shortcuts.map((shortcut) => (
        <ShortcutDisplay
          key={shortcut.id}
          shortcut={shortcut}
          size={size}
          showDescription={showDescription}
        />
      ))}
    </div>
  );
}

export interface KbdHintsProps {
  shortcuts: ShortcutDefinition[];
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export function KbdHints({ shortcuts, size = 'md', showDescription = true }: KbdHintsProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {shortcuts.map((shortcut, idx) => (
        <React.Fragment key={shortcut.id}>
          {idx > 0 && <span style={{ color: '#9ca3af' }}>/</span>}
          <ShortcutDisplay
            shortcut={shortcut}
            size={size}
            showDescription={showDescription}
            layout="horizontal"
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export interface ShortcutCheatSheetProps {
  groups: ShortcutGroup[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function ShortcutCheatSheet({
  groups,
  isOpen,
  onClose,
  title = 'Keyboard Shortcuts',
}: ShortcutCheatSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '24px',
          }}
        >
          {groups.map((group, idx) => (
            <div key={idx}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                {group.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {group.shortcuts.map((shortcut) => (
                  <ShortcutDisplay
                    key={shortcut.id}
                    shortcut={shortcut}
                    size="md"
                    showDescription={true}
                    layout="vertical"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { id: 'help', keys: { key: '?', modifiers: ['shift'] }, description: 'Show shortcuts' },
      { id: 'settings', keys: { key: ',', modifiers: ['ctrl'] }, description: 'Open settings' },
      { id: 'command-palette', keys: { key: 'K', modifiers: ['ctrl'] }, description: 'Command palette' },
      { id: 'search', keys: { key: 'F', modifiers: ['ctrl'] }, description: 'Search' },
    ],
  },
  {
    title: 'Chat',
    shortcuts: [
      { id: 'send', keys: { key: 'Enter' }, description: 'Send message' },
      { id: 'new-line', keys: { key: 'Enter', modifiers: ['shift'] }, description: 'New line' },
      { id: 'clear', keys: { key: 'Escape' }, description: 'Clear input' },
      { id: 'history-up', keys: { key: 'ArrowUp' }, description: 'Previous message' },
      { id: 'history-down', keys: { key: 'ArrowDown' }, description: 'Next message' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { id: 'goto-chat', keys: { key: '1', modifiers: ['ctrl'] }, description: 'Go to chat' },
      { id: 'goto-history', keys: { key: '2', modifiers: ['ctrl'] }, description: 'Go to history' },
      { id: 'goto-agents', keys: { key: '3', modifiers: ['ctrl'] }, description: 'Go to agents' },
      { id: 'goto-tools', keys: { key: '4', modifiers: ['ctrl'] }, description: 'Go to tools' },
    ],
  },
];

export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keys = Array.isArray(shortcut.keys) ? shortcut.keys : [shortcut.keys];
        
        for (const keyCombo of keys) {
          const modifiers = keyCombo.modifiers || [];
          
          const ctrlMatch = modifiers.includes('ctrl') === (event.ctrlKey || event.metaKey);
          const altMatch = modifiers.includes('alt') === event.altKey;
          const shiftMatch = modifiers.includes('shift') === event.shiftKey;
          const metaMatch = modifiers.includes('meta') === event.metaKey;
          
          const keyLower = event.key.toLowerCase();
          const comboKeyLower = keyCombo.key.toLowerCase();
          const keyMatch = keyLower === comboKeyLower || keyLower === comboKeyLower.replace('+', '');
          
          if (ctrlMatch && altMatch && shiftMatch && metaMatch && keyMatch) {
            event.preventDefault();
            event.stopPropagation();
            shortcut.action?.();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export default ShortcutKey;
