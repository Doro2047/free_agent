import React, { useState, ReactNode } from 'react';

export type TabsVariant = 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabItem {
  label: string;
  content?: ReactNode;
  icon?: ReactNode;
  isDisabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultIndex?: number;
  index?: number;
  onChange?: (index: number) => void;
  variant?: TabsVariant;
  orientation?: TabsOrientation;
  isFitted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

const Tabs = ({
  items,
  defaultIndex = 0,
  index: controlledIndex,
  onChange,
  variant = 'line',
  orientation = 'horizontal',
  isFitted = false,
  size = 'md',
  children,
}: TabsProps) => {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const activeIndex = controlledIndex ?? internalIndex;

  const handleTabClick = (index: number) => {
    if (items[index]?.isDisabled) return;
    setInternalIndex(index);
    onChange?.(index);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    if (event.key === 'ArrowRight') {
      newIndex = index + 1 < items.length ? index + 1 : 0;
    } else if (event.key === 'ArrowLeft') {
      newIndex = index - 1 >= 0 ? index - 1 : items.length - 1;
    } else if (event.key === 'Home') {
      newIndex = 0;
    } else if (event.key === 'End') {
      newIndex = items.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    handleTabClick(newIndex);
  };

  const sizeStyles = {
    sm: { fontSize: '0.875rem', padding: '0.5rem 1rem' },
    md: { fontSize: '1rem', padding: '0.75rem 1.25rem' },
    lg: { fontSize: '1.125rem', padding: '1rem 1.5rem' },
  };

  const getTabStyles = (index: number): React.CSSProperties => {
    const isActive = index === activeIndex;
    const base: React.CSSProperties = {
      padding: sizeStyles[size].padding,
      fontSize: sizeStyles[size].fontSize,
      fontWeight: isActive ? 600 : 400,
      cursor: items[index]?.isDisabled ? 'not-allowed' : 'pointer',
      opacity: items[index]?.isDisabled ? 0.5 : 1,
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
    };

    switch (variant) {
      case 'line':
        return {
          ...base,
          borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
          color: isActive ? '#3b82f6' : '#6b7280',
        };
      case 'enclosed':
        return {
          ...base,
          borderTop: isActive ? '2px solid #3b82f6' : '2px solid transparent',
          borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
          borderRight: isActive ? '2px solid #3b82f6' : '2px solid transparent',
          borderRadius: '0.375rem 0.375rem 0 0',
          color: isActive ? '#3b82f6' : '#6b7280',
          backgroundColor: isActive ? '#ffffff' : '#f3f4f6',
        };
      case 'soft-rounded':
        return {
          ...base,
          borderRadius: '9999px',
          color: isActive ? '#ffffff' : '#6b7280',
          backgroundColor: isActive ? '#3b82f6' : 'transparent',
        };
      case 'solid-rounded':
        return {
          ...base,
          borderRadius: '0.375rem',
          color: isActive ? '#ffffff' : '#374151',
          backgroundColor: isActive ? '#3b82f6' : '#e5e7eb',
        };
      default:
        return base;
    }
  };

  const containerStyle: React.CSSProperties = {
    display: orientation === 'vertical' ? 'flex' : 'block',
    gap: orientation === 'vertical' ? '1rem' : 0,
  };

  const tabListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'vertical' ? 'column' : 'row',
    borderBottom: variant === 'line' && orientation === 'horizontal' ? '2px solid #e2e8f0' : 'none',
    borderRight: variant === 'line' && orientation === 'vertical' ? '2px solid #e2e8f0' : 'none',
    width: isFitted && orientation === 'horizontal' ? '100%' : 'auto',
  };

  return (
    <div style={containerStyle}>
      <div role="tablist" style={tabListStyle}>
        {items.map((item, index) => (
          <button
            key={index}
            role="tab"
            id={`tab-${index}`}
            aria-selected={index === activeIndex}
            aria-controls={`tabpanel-${index}`}
            tabIndex={index === activeIndex ? 0 : -1}
            disabled={item.isDisabled}
            onClick={() => handleTabClick(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={{
              ...getTabStyles(index),
              flex: isFitted && orientation === 'horizontal' ? 1 : 'none',
              width: isFitted && orientation === 'vertical' ? '100%' : 'auto',
            }}
          >
            {item.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${activeIndex}`}
        aria-labelledby={`tab-${activeIndex}`}
        style={{
          paddingTop: '1rem',
          outline: 'none',
        }}
      >
        {items[activeIndex]?.content}
        {children}
      </div>
    </div>
  );
};

Tabs.displayName = 'Tabs';

export { Tabs };
