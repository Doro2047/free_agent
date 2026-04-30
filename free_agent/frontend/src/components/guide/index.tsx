import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export interface GuideStep {
  id: string;
  target: string;
  title: string;
  content: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  offset?: number;
  showSkip?: boolean;
  showPrev?: boolean;
  showNext?: boolean;
  showProgress?: boolean;
  prevText?: string;
  nextText?: string;
  skipText?: string;
  doneText?: string;
}

export interface Guide {
  id: string;
  title?: string;
  steps: GuideStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
  showDots?: boolean;
}

export interface GuideContextValue {
  isActive: boolean;
  currentGuide: Guide | null;
  currentStepIndex: number;
  currentStep: GuideStep | null;
  startGuide: (guide: Guide) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipGuide: () => void;
  completeGuide: () => void;
  goToStep: (index: number) => void;
  isCompleted: (guideId: string) => boolean;
  markCompleted: (guideId: string) => void;
  resetGuide: (guideId: string) => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuide() {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
}

const STORAGE_KEY = 'free-agent-guides-completed';

function getStoredCompletedGuides(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function storeCompletedGuide(guideId: string): void {
  try {
    const completed = getStoredCompletedGuides();
    completed.add(guideId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  } catch {}
}

function removeStoredCompletedGuide(guideId: string): void {
  try {
    const completed = getStoredCompletedGuides();
    completed.delete(guideId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  } catch {}
}

export interface GuideProviderProps {
  children: ReactNode;
}

export function GuideProvider({ children }: GuideProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentGuide, setCurrentGuide] = useState<Guide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedGuides, setCompletedGuides] = useState<Set<string>>(getStoredCompletedGuides());
  const targetElementRef = useRef<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const currentStep = currentGuide?.steps[currentStepIndex] || null;

  const calculatePosition = useCallback(() => {
    if (!currentStep) return;

    const target = document.querySelector(currentStep.target);
    if (!target) {
      console.warn(`Guide: Target element not found: ${currentStep.target}`);
      return;
    }

    const rect = target.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    });
  }, [currentStep]);

  const startGuide = useCallback((guide: Guide) => {
    if (guide.steps.length === 0) return;
    setCurrentGuide(guide);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (!currentGuide) return;
    if (currentStepIndex < currentGuide.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeGuide();
    }
  }, [currentGuide, currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipGuide = useCallback(() => {
    if (currentGuide) {
      currentGuide.onSkip?.();
    }
    setIsActive(false);
    setCurrentGuide(null);
    setCurrentStepIndex(0);
  }, [currentGuide]);

  const completeGuide = useCallback(() => {
    if (currentGuide) {
      storeCompletedGuide(currentGuide.id);
      setCompletedGuides(prev => new Set([...prev, currentGuide.id]));
      currentGuide.onComplete?.();
    }
    setIsActive(false);
    setCurrentGuide(null);
    setCurrentStepIndex(0);
  }, [currentGuide]);

  const goToStep = useCallback((index: number) => {
    if (!currentGuide) return;
    if (index >= 0 && index < currentGuide.steps.length) {
      setCurrentStepIndex(index);
    }
  }, [currentGuide]);

  const isCompleted = useCallback((guideId: string) => {
    return completedGuides.has(guideId);
  }, [completedGuides]);

  const markCompleted = useCallback((guideId: string) => {
    storeCompletedGuide(guideId);
    setCompletedGuides(prev => new Set([...prev, guideId]));
  }, []);

  const resetGuide = useCallback((guideId: string) => {
    removeStoredCompletedGuide(guideId);
    setCompletedGuides(prev => {
      const next = new Set(prev);
      next.delete(guideId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (currentStep) {
      calculatePosition();
      
      const handleScroll = () => calculatePosition();
      const handleResize = () => calculatePosition();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [currentStep, calculatePosition]);

  const value: GuideContextValue = {
    isActive,
    currentGuide,
    currentStepIndex,
    currentStep,
    startGuide,
    nextStep,
    prevStep,
    skipGuide,
    completeGuide,
    goToStep,
    isCompleted,
    markCompleted,
    resetGuide,
  };

  return (
    <GuideContext.Provider value={value}>
      {children}
      {isActive && currentStep && <GuideOverlay />}
    </GuideContext.Provider>
  );
}

function GuideOverlay() {
  const { currentStep, currentGuide, currentStepIndex, nextStep, prevStep, skipGuide } = useGuide();
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!currentStep) return null;

  const placement = currentStep.placement || 'bottom';
  const offset = currentStep.offset || 10;

  const getTooltipStyle = (): React.CSSProperties => {
    const pos = {
      top: parseFloat(String(currentStep?.offset || 0)),
      left: 0,
      width: 0,
      height: 0,
    };

    const tooltipWidth = tooltipRef.current?.offsetWidth || 300;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 150;

    switch (placement) {
      case 'top':
        return {
          top: pos.top - tooltipHeight - offset,
          left: pos.left + pos.width / 2 - tooltipWidth / 2,
        };
      case 'bottom':
        return {
          top: pos.top + pos.height + offset,
          left: pos.left + pos.width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          top: pos.top + pos.height / 2 - tooltipHeight / 2,
          left: pos.left - tooltipWidth - offset,
        };
      case 'right':
        return {
          top: pos.top + pos.height / 2 - tooltipHeight / 2,
          left: pos.left + pos.width + offset,
        };
      case 'center':
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      default:
        return {
          top: pos.top + pos.height + offset,
          left: pos.left + pos.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const showProgress = currentStep.showProgress ?? true;
  const showSkip = currentStep.showSkip ?? true;
  const showPrev = currentStep.showPrev ?? currentStepIndex > 0;
  const showNext = currentStep.showNext ?? true;
  const prevText = currentStep.prevText || 'Previous';
  const nextText = currentStep.nextText || (currentStepIndex === (currentGuide?.steps.length || 0) - 1 ? 'Done' : 'Next');
  const skipText = currentStep.skipText || 'Skip';

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          pointerEvents: 'none',
        }}
      />
      <div
        ref={tooltipRef}
        role="dialog"
        aria-labelledby="guide-title"
        style={{
          position: 'absolute',
          zIndex: 9999,
          maxWidth: '400px',
          minWidth: '300px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '20px',
          ...getTooltipStyle(),
        }}
      >
        {currentStep.title && (
          <h3 id="guide-title" style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>
            {currentStep.title}
          </h3>
        )}
        <div style={{ marginBottom: '16px', color: '#6b7280' }}>
          {currentStep.content}
        </div>
        
        {showProgress && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {currentGuide?.steps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: idx <= currentStepIndex ? '#3b82f6' : '#e5e7eb',
                    transition: 'background-color 200ms',
                  }}
                />
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              {currentStepIndex + 1} / {currentGuide?.steps.length}
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {showSkip && (
              <button
                onClick={skipGuide}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  color: '#6b7280',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {skipText}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {showPrev && (
              <button
                onClick={prevStep}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  color: '#6b7280',
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {prevText}
              </button>
            )}
            {showNext && (
              <button
                onClick={nextStep}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  color: 'white',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {nextText}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export interface GuideTourProps {
  guide: Guide;
  trigger?: 'auto' | 'manual';
  delay?: number;
}

export function useGuideTour({ guide, trigger = 'manual', delay = 1000 }: GuideTourProps) {
  const { startGuide, isCompleted, resetGuide } = useGuide();
  const hasStarted = useRef(false);

  const start = useCallback(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setTimeout(() => {
      startGuide(guide);
    }, delay);
  }, [guide, delay, startGuide]);

  const restart = useCallback(() => {
    hasStarted.current = false;
    resetGuide(guide.id);
    start();
  }, [guide.id, resetGuide, start]);

  useEffect(() => {
    if (trigger === 'auto' && !isCompleted(guide.id) && !hasStarted.current) {
      start();
    }
  }, [trigger, guide.id, isCompleted, start]);

  return { start, restart, isCompleted: isCompleted(guide.id) };
}

export const WelcomeGuide: Guide = {
  id: 'welcome',
  title: 'Welcome to Free Agent!',
  showProgress: true,
  steps: [
    {
      id: 'welcome-1',
      target: '.chat-input',
      title: 'Start a Conversation',
      content: 'Type your message in the chat input below to start interacting with your AI assistant.',
      placement: 'top',
    },
    {
      id: 'welcome-2',
      target: '.agent-selector',
      title: 'Choose Your Agent',
      content: 'Select from various AI agents optimized for different tasks like coding, writing, or analysis.',
      placement: 'bottom',
    },
    {
      id: 'welcome-3',
      target: '.settings-button',
      title: 'Customize Settings',
      content: 'Access settings to configure your preferences, API keys, and more.',
      placement: 'left',
    },
  ],
  onComplete: () => {
    console.log('Welcome guide completed!');
  },
};

export default GuideProvider;
