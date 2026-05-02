import React, { useEffect, useRef, ReactNode } from 'react';

export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-hidden'?: boolean;
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean;
  'aria-pressed'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-current'?: boolean;
  'aria-valuenow'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuetext'?: string;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-controls'?: string;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  'aria-orientation'?: 'horizontal' | 'vertical' | 'undefined';
}

export interface FocusTrapProps {
  children: ReactNode;
  isActive?: boolean;
  onEscape?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
  finalFocusRef?: React.RefObject<HTMLElement>;
}

export class FocusTrap extends React.Component<FocusTrapProps> {
  private containerRef: React.RefObject<HTMLDivElement>;
  private previouslyFocused: HTMLElement | null;
  private focusableElements = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  constructor(props: FocusTrapProps) {
    super(props);
    this.containerRef = React.createRef();
    this.previouslyFocused = null;
  }

  componentDidMount() {
    if (this.props.isActive) {
      this.activate();
    }
  }

  componentDidUpdate(prevProps: FocusTrapProps) {
    if (this.props.isActive && !prevProps.isActive) {
      this.activate();
    } else if (!this.props.isActive && prevProps.isActive) {
      this.deactivate();
    }
  }

  componentWillUnmount() {
    this.deactivate();
  }

  activate = () => {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.handleInitialFocus();
    document.addEventListener('keydown', this.handleKeyDown);
  };

  deactivate = () => {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.previouslyFocused && this.previouslyFocused.focus) {
      this.previouslyFocused.focus();
    }
  };

  handleInitialFocus = () => {
    const container = this.containerRef.current;
    if (!container) return;

    const { initialFocusRef } = this.props;
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }

    const focusable = container.querySelectorAll(this.focusableElements);
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }
  };

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.props.onEscape?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const container = this.containerRef.current;
    if (!container) return;

    const focusable = Array.from(
      container.querySelectorAll(this.focusableElements)
    ) as HTMLElement[];

    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  render() {
    return (
      <div ref={this.containerRef} style={{ display: 'contents' }}>
        {this.props.children}
      </div>
    );
  }
}

export interface SkipLinkProps {
  targetId: string;
  children?: ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  children = 'Skip to main content',
}) => {
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        zIndex: 99999,
        padding: '1rem',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        textDecoration: 'none',
        fontWeight: 600,
      }}
      onFocus={(e) => {
        e.currentTarget.style.left = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.left = '-9999px';
      }}
    >
      {children}
    </a>
  );
};

export interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  children?: ReactNode;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  children,
}) => {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message || children}
    </div>
  );
};

export interface VisuallyHiddenProps {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
  children,
  as: Component = 'div',
}) => {
  return (
    <Component
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Component>
  );
};

export interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
  finalFocusRef?: React.RefObject<HTMLElement>;
}

export function useFocusTrap({
  isActive,
  onEscape,
  initialFocusRef,
  finalFocusRef: _finalFocusRef,
}: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const container = containerRef.current;
    const focusableElements = container 
      ? (Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[])
      : [];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const currentFocusableElements = Array.from(
        container.querySelectorAll(focusableSelectors)
      ) as HTMLElement[];

      if (currentFocusableElements.length === 0) return;

      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !container.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement || !container.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, onEscape]);

  return containerRef;
}

export interface UseKeyboardNavigationOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  onSelect?: (index: number) => void;
  onFocus?: (index: number) => void;
}

export function useKeyboardNavigation<T extends HTMLElement>(
  itemCount: number,
  options: UseKeyboardNavigationOptions = {}
) {
  const { orientation = 'both', loop = true, onSelect, onFocus } = options;
  const currentIndexRef = useRef(0);

  const handleKeyDown = (event: React.KeyboardEvent<T>) => {
    let newIndex = currentIndexRef.current;
    let handled = true;

    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          newIndex = currentIndexRef.current + 1;
        } else {
          handled = false;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          newIndex = currentIndexRef.current - 1;
        } else {
          handled = false;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          newIndex = currentIndexRef.current + 1;
        } else {
          handled = false;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          newIndex = currentIndexRef.current - 1;
        } else {
          handled = false;
        }
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = itemCount - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(currentIndexRef.current);
        return;
      default:
        handled = false;
    }

    if (!handled) return;

    event.preventDefault();

    if (loop) {
      if (newIndex < 0) newIndex = itemCount - 1;
      if (newIndex >= itemCount) newIndex = 0;
    } else {
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= itemCount) newIndex = itemCount - 1;
    }

    currentIndexRef.current = newIndex;
    onFocus?.(newIndex);
  };

  return {
    handleKeyDown,
    currentIndex: currentIndexRef.current,
    setCurrentIndex: (index: number) => {
      currentIndexRef.current = Math.max(0, Math.min(index, itemCount - 1));
    },
  };
}

export const a11yHelpers = {
  getAriaLabel: (label?: string, fallback?: string) => label || fallback,
  getAriaDescribedBy: (id?: string) => id,
  isFocusable: (element: HTMLElement) => {
    if (element.hasAttribute('tabindex')) {
      const tabindex = element.getAttribute('tabindex');
      return tabindex !== '-1';
    }
    const focusable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    return focusable.includes(element.tagName);
  },
  getFirstFocusable: (container: HTMLElement): HTMLElement | null => {
    const focusable = container.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    return (focusable[0] as HTMLElement) || null;
  },
  getLastFocusable: (container: HTMLElement): HTMLElement | null => {
    const focusable = container.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    return (focusable[focusable.length - 1] as HTMLElement) || null;
  },
  announce: (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', politeness);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute(
      'style',
      'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;'
    );
    document.body.appendChild(announcement);

    setTimeout(() => {
      announcement.textContent = message;
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }, 100);
  },
};

export default {
  FocusTrap,
  SkipLink,
  LiveRegion,
  VisuallyHidden,
  useFocusTrap,
  useKeyboardNavigation,
  ...a11yHelpers,
};
