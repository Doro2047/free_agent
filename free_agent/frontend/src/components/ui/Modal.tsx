import React, { useEffect, useRef, ReactNode, MouseEvent } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ModalVariant = 'centered' | 'top' | 'bottom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  variant?: ModalVariant;
  isCloseOnOverlayClick?: boolean;
  isCloseOnEsc?: boolean;
  isCloseOnButton?: boolean;
  closeButton?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const Modal = ({
  isOpen,
  onClose,
  size = 'md',
  variant = 'centered',
  isCloseOnOverlayClick = true,
  isCloseOnEsc = true,
  isCloseOnButton = true,
  closeButton = true,
  header,
  footer,
  children,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isCloseOnEsc && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isCloseOnEsc, onClose]);

  const handleOverlayClick = (event: MouseEvent) => {
    if (isCloseOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeStyles: Record<ModalSize, string> = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  const variantStyles: Record<ModalVariant, React.CSSProperties> = {
    centered: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
    top: {
      position: 'fixed',
      top: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      position: 'fixed',
      bottom: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
    },
  };

  const modalContent = (
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
        alignItems: variant === 'centered' ? 'center' : variant === 'top' ? 'flex-start' : 'flex-end',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          ...variantStyles[variant],
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          width: '100%',
          maxWidth: sizeStyles[size],
          maxHeight: variant === 'centered' ? '90vh' : '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {(header || closeButton) && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {header && (
              <h2
                id="modal-title"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0,
                }}
              >
                {header}
              </h2>
            )}
            {closeButton && (
              <button
                onClick={onClose}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  color: '#6b7280',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#1f2937';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

Modal.displayName = 'Modal';

export { Modal };
