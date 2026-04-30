import React, { useState, useEffect, useRef, useCallback, ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export type AnimationType =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'bounce'
  | 'flip'
  | 'collapse'
  | 'rotate'
  | 'scale';

export type AnimationDirection = 'up' | 'down' | 'left' | 'right' | 'none';
export type AnimationEasing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'spring';

export interface UseAnimationOptions {
  type?: AnimationType;
  direction?: AnimationDirection;
  duration?: number;
  easing?: AnimationEasing;
  delay?: number;
  onStart?: () => void;
  onComplete?: () => void;
}

export interface AnimateProps {
  children: ReactNode;
  type?: AnimationType;
  direction?: AnimationDirection;
  duration?: number;
  delay?: number;
  easing?: AnimationEasing;
  isVisible?: boolean;
  style?: CSSProperties;
}

export const useAnimation = (options: UseAnimationOptions = {}) => {
  const {
    type = 'fade',
    direction = 'none',
    duration = 300,
    easing = 'ease-out',
    delay = 0,
    onStart,
    onComplete,
  } = options;

  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      onStart?.();

      const timer = setTimeout(() => {
        setIsAnimating(false);
        onComplete?.();
      }, duration + delay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, delay]);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const getAnimationStyle = (): CSSProperties => {
    if (!isVisible && !isAnimating) {
      return { opacity: 0, transform: 'scale(0.95)' };
    }

    const baseStyle: CSSProperties = {
      transition: `all ${duration}ms ${easing}`,
      transitionDelay: `${delay}ms`,
    };

    switch (type) {
      case 'fade':
        return { ...baseStyle, opacity: isVisible ? 1 : 0 };

      case 'slide':
        const slideTransforms = {
          up: isVisible ? 'translateY(0)' : 'translateY(20px)',
          down: isVisible ? 'translateY(0)' : 'translateY(-20px)',
          left: isVisible ? 'translateX(0)' : 'translateX(20px)',
          right: isVisible ? 'translateX(0)' : 'translateX(-20px)',
          none: 'translateX(0) translateY(0)',
        };
        return { ...baseStyle, opacity: isVisible ? 1 : 0, transform: slideTransforms[direction] };

      case 'zoom':
        return { ...baseStyle, opacity: isVisible ? 1 : 0, transform: isVisible ? 'scale(1)' : 'scale(0.9)' };

      case 'bounce':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)',
        };

      case 'flip':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'rotateY(0deg)' : 'rotateY(90deg)',
          backfaceVisibility: 'hidden',
        };

      case 'collapse':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          maxHeight: isVisible ? '1000px' : '0',
          overflow: 'hidden',
        };

      case 'rotate':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'rotate(0deg)' : 'rotate(-180deg)',
        };

      case 'scale':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0)',
        };

      default:
        return baseStyle;
    }
  };

  return {
    isVisible,
    isAnimating,
    show,
    hide,
    getAnimationStyle,
  };
};

export const Animate: React.FC<AnimateProps> = ({
  children,
  type = 'fade',
  direction = 'none',
  duration = 300,
  delay = 0,
  easing = 'ease-out',
  isVisible: controlledIsVisible,
  style,
}) => {
  const [internalIsVisible, setInternalIsVisible] = useState(false);
  const isVisible = controlledIsVisible ?? internalIsVisible;

  useEffect(() => {
    if (controlledIsVisible === undefined) {
      setInternalIsVisible(true);
    }
  }, [controlledIsVisible]);

  const { getAnimationStyle } = useAnimation({
    type,
    direction,
    duration,
    delay,
    easing,
  });

  return (
    <div style={{ ...getAnimationStyle(), ...style }}>
      {children}
    </div>
  );
};

export interface TransitionProps {
  children: ReactNode;
  in: boolean;
  timeout?: number;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  onEnter?: () => void;
  onEntering?: () => void;
  onEntered?: () => void;
  onExit?: () => void;
  onExiting?: () => void;
  onExited?: () => void;
  childrenProps?: any;
}

export class Transition extends React.Component<TransitionProps> {
  private nodeRef = React.createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: TransitionProps) {
    const { in: isIn, onEnter, onEntered, onExit, onExited } = this.props;

    if (prevProps.in !== isIn) {
      if (isIn) {
        onEnter?.();
        requestAnimationFrame(() => {
          this.nodeRef.current?.classList.add('enter');
          onEntered?.();
        });
      } else {
        onExit?.();
        requestAnimationFrame(() => {
          this.nodeRef.current?.classList.add('exit');
          setTimeout(() => {
            this.nodeRef.current?.classList.remove('exit');
            onExited?.();
          }, this.props.timeout || 300);
        });
      }
    }
  }

  render() {
    const {
      in: isIn,
      mountOnEnter,
      unmountOnExit,
      children,
      childrenProps,
    } = this.props;

    if (mountOnEnter && !isIn) return null;
    if (unmountOnExit && !isIn) return null;

    return (
      <div
        ref={this.nodeRef}
        style={{
          transition: `all ${this.props.timeout || 300}ms ease-out`,
        }}
        {...childrenProps}
      >
        {children}
      </div>
    );
  }
}

export interface MotionProps {
  children: ReactNode;
  initial?: CSSProperties;
  animate?: CSSProperties;
  exit?: CSSProperties;
  transition?: {
    type?: string;
    stiffness?: number;
    damping?: number;
    mass?: number;
    duration?: number;
  };
  onAnimationComplete?: () => void;
}

export const Motion: React.FC<MotionProps> = ({
  children,
  initial = { opacity: 0 },
  animate = { opacity: 1 },
  exit,
  transition = { type: 'spring', stiffness: 300, damping: 20 },
  onAnimationComplete,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(initial);

  useEffect(() => {
    setIsMounted(true);
    requestAnimationFrame(() => {
      setIsVisible(true);
      setCurrentStyle(animate);
    });
  }, []);

  const handleTransitionEnd = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  return (
    <div
      style={{
        ...initial,
        ...currentStyle,
        transition: transition.duration
          ? `all ${transition.duration}ms`
          : `all ${transition.stiffness}ms ${transition.type}`,
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  );
};

export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },
  slideInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },
  slideInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2 },
  },
  bounceIn: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 400, damping: 15 },
  },
};

export const AnimationGroup: React.FC<{
  children: ReactNode;
  staggerDelay?: number;
  mode?: 'together' | 'stagger';
}> = ({ children, staggerDelay = 0.1, mode = 'together' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'stagger' && containerRef.current) {
      const children = containerRef.current.children;
      Array.from(children).forEach((child, index) => {
        (child as HTMLElement).style.animationDelay = `${index * staggerDelay}s`;
      });
    }
  }, [mode, staggerDelay]);

  return <div ref={containerRef}>{children}</div>;
};

export default {
  Animate,
  Transition,
  Motion,
  AnimationGroup,
  useAnimation,
  animations,
};
