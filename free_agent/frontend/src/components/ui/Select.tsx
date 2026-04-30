import React, { useState, useRef, useEffect, ReactNode, KeyboardEvent } from 'react';

export type SelectSize = 'sm' | 'md' | 'lg' | 'xl';
export type SelectVariant = 'outline' | 'filled' | 'flushed';

export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  isMulti?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
  helperText?: string;
  label?: string;
  id?: string;
}

const Select = ({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select an option...',
  size = 'md',
  variant = 'outline',
  isMulti = false,
  isSearchable = false,
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  errorMessage,
  helperText,
  label,
  id = 'select',
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState<string | string[]>(
    controlledValue ?? defaultValue ?? (isMulti ? [] : '')
  );
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && isSearchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isSearchable]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (option: SelectOption) => {
    if (option.isDisabled) return;

    let newValue: string | string[];

    if (isMulti) {
      const currentArray = Array.isArray(selectedValue) ? selectedValue : [];
      if (currentArray.includes(option.value)) {
        newValue = currentArray.filter((v) => v !== option.value);
      } else {
        newValue = [...currentArray, option.value];
      }
    } else {
      newValue = option.value;
      setIsOpen(false);
    }

    setSelectedValue(newValue);
    onChange?.(newValue);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = isMulti ? [] : '';
    setSelectedValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isDisabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const getDisplayValue = (): string => {
    if (isMulti) {
      const selectedArray = Array.isArray(selectedValue) ? selectedValue : [];
      if (selectedArray.length === 0) return '';
      return `${selectedArray.length} selected`;
    }
    const selected = options.find((opt) => opt.value === selectedValue);
    return selected?.label || '';
  };

  const sizeStyles: Record<SelectSize, { height: string; fontSize: string; padding: string }> = {
    sm: { height: '2rem', fontSize: '0.875rem', padding: '0 0.5rem' },
    md: { height: '2.5rem', fontSize: '1rem', padding: '0 0.75rem' },
    lg: { height: '3rem', fontSize: '1.125rem', padding: '0 1rem' },
    xl: { height: '3.5rem', fontSize: '1.25rem', padding: '0 1.25rem' },
  };

  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: sizeStyles[size].height,
    fontSize: sizeStyles[size].fontSize,
    padding: sizeStyles[size].padding,
    border: `2px solid ${errorMessage ? '#ef4444' : isOpen ? '#3b82f6' : '#e2e8f0'}`,
    borderRadius: '0.375rem',
    backgroundColor: variant === 'filled' ? '#f1f5f9' : 'transparent',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    outline: 'none',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  return (
    <div style={{ width: '100%' }} ref={containerRef}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: errorMessage ? '#ef4444' : '#374151',
          }}
        >
          {label}
        </label>
      )}

      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        tabIndex={isDisabled ? -1 : 0}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={baseStyles}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isSearchable && isOpen ? (
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={placeholder}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 'inherit',
                width: '100%',
              }}
            />
          ) : (
            <span style={{ color: getDisplayValue() ? '#374151' : '#9ca3af' }}>
              {getDisplayValue() || placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isClearable && selectedValue && (
            <button
              onClick={handleClear}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                color: '#9ca3af',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          {isLoading && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="10" />
            </svg>
          )}

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '0.25rem 0',
            listStyle: 'none',
            margin: 0,
          }}
        >
          {filteredOptions.length === 0 ? (
            <li
              style={{
                padding: '0.75rem',
                textAlign: 'center',
                color: '#9ca3af',
              }}
            >
              No options found
            </li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = isMulti
                ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                : selectedValue === option.value;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: option.isDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: highlightedIndex === index ? '#f3f4f6' : isSelected ? '#e0f2fe' : 'transparent',
                    color: option.isDisabled ? '#9ca3af' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isMulti && (
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: `2px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  )}
                  {option.icon && option.icon}
                  {option.label}
                  {!isMulti && isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      style={{ marginLeft: 'auto' }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}

      {errorMessage && (
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444' }}>
          {errorMessage}
        </p>
      )}

      {helperText && !errorMessage && (
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
          {helperText}
        </p>
      )}
    </div>
  );
};

Select.displayName = 'Select';

export { Select };
