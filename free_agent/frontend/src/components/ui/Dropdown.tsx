import React, { useState, useRef, useEffect, ReactNode } from 'react';

export interface DropdownItem {
  label: string;
  value?: string;
  icon?: ReactNode;
  isDisabled?: boolean;
  isDivider?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  isDisabled?: boolean;
}

const Dropdown = ({
  trigger,
  items,
  isOpen: controlledIsOpen,
  onOpenChange,
  placement = 'bottom',
  offset = 4,
  isDisabled = false,
}: DropdownProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (controlledIsOpen === undefined) {
          setInternalIsOpen(false);
        } else {
          onOpenChange?.(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [controlledIsOpen, onOpenChange]);

  const handleItemClick = (item: DropdownItem) => {
    if (item.isDisabled || item.isDivider) return;
    item.onClick?.();
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(false);
    } else {
      onOpenChange?.(false);
    }
  };

  const handleTriggerClick = () => {
    if (isDisabled) return;
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(!internalIsOpen);
    } else {
      onOpenChange?.(!controlledIsOpen);
    }
  };

  const getPlacementStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (placement) {
      case 'top':
        return { ...base, bottom: `calc(100% + ${offset}px)`, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { ...base, top: `calc(100% + ${offset}px)`, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...base, right: `calc(100% + ${offset}px)`, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { ...base, left: `calc(100% + ${offset}px)`, top: '50%', transform: 'translateY(-50%)' };
      default:
        return base;
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={handleTriggerClick} style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}>
        {trigger}
      </div>

      {isOpen && (
        <div style={getPlacementStyles()}>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              padding: '0.25rem 0',
              minWidth: '12rem',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {items.map((item, index) =>
              item.isDivider ? (
                <div key={index} style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.25rem 0' }} />
              ) : (
                <div
                  key={index}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: '0.5rem 1rem',
                    cursor: item.isDisabled ? 'not-allowed' : 'pointer',
                    opacity: item.isDisabled ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                    if (!item.isDisabled) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {item.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
                  {item.label}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

Dropdown.displayName = 'Dropdown';

export { Dropdown };
