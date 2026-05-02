import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  category?: string;
  action: () => void;
  isDisabled?: boolean;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  emptyMessage?: string;
  maxHeight?: string;
  width?: string;
  recentItems?: CommandItem[];
  enableRecent?: boolean;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  items,
  placeholder = 'Type a command or search...',
  emptyMessage = 'No results found',
  maxHeight = '400px',
  width = '560px',
  recentItems = [],
  enableRecent = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [_showRecent, setShowRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const flatItems = filteredItems;
  const displayItems = searchQuery ? filteredItems : (enableRecent ? recentItems : []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setShowRecent(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selectedItem = flatItems[selectedIndex];
        if (selectedItem && !selectedItem.isDisabled) {
          selectedItem.action();
          onClose();
        }
      } else if (event.key === 'Tab') {
        event.preventDefault();
        if (searchQuery) {
          setShowRecent(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, searchQuery, onClose]);

  useEffect(() => {
    if (listRef.current && flatItems.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleItemClick = useCallback((item: CommandItem) => {
    if (item.isDisabled) return;
    item.action();
    onClose();
  }, [onClose]);

  const renderShortcut = (shortcut: string) => {
    const keys = shortcut.split('+');
    return (
      <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
        {keys.map((key, i) => (
          <kbd
            key={i}
            style={{
              padding: '0.125rem 0.375rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: '#6b7280',
            }}
          >
            {key}
          </kbd>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 99999,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width,
          maxWidth: '90vw',
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          overflow: 'hidden',
          animation: 'slideDown 0.2s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            style={{ marginRight: '0.75rem', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              backgroundColor: 'transparent',
              color: '#1f2937',
            }}
          />
          <kbd
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}
          >
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          style={{
            maxHeight,
            overflowY: 'auto',
            padding: '0.5rem',
          }}
        >
          {displayItems.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#9ca3af',
              }}
            >
              {emptyMessage}
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {category}
                </div>
                {categoryItems.map((item, _index) => {
                  const flatIndex = flatItems.indexOf(item);
                  const isSelected = flatIndex === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      data-index={flatIndex}
                      onClick={() => handleItemClick(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.625rem 0.75rem',
                        borderRadius: '0.375rem',
                        cursor: item.isDisabled ? 'not-allowed' : 'pointer',
                        opacity: item.isDisabled ? 0.5 : 1,
                        backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!item.isDisabled) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {item.icon && (
                        <div
                          style={{
                            marginRight: '0.75rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {item.icon}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#9ca3af',
                              marginTop: '0.125rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.shortcut && renderShortcut(item.shortcut)}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            fontSize: '0.75rem',
            color: '#9ca3af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}>↑</kbd>
            <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}>↓</kbd>
            <span>Navigate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}>↵</kbd>
            <span>Select</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

CommandPalette.displayName = 'CommandPalette';

export { CommandPalette };
