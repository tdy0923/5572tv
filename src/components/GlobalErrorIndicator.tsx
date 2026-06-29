'use client';

import { useCallback, useEffect, useState } from 'react';

interface ErrorInfo {
  id: string;
  message: string;
  timestamp: number;
}

export function GlobalErrorIndicator() {
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setCurrentError(null);
      setIsReplacing(false);
      setIsClosing(false);
    }, 300);
  }, []);

  useEffect(() => {
    const suppressedPatterns = [
      'No Listener',
      'tabs:outgoing',
      'message.ready',
    ];

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason?.message || '';
      if (suppressedPatterns.some((p) => msg.includes(p))) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
    };
  }, []);

  useEffect(() => {
    const handleError = (event: CustomEvent) => {
      const { message } = event.detail;
      const newError: ErrorInfo = {
        id: Date.now().toString(),
        message,
        timestamp: Date.now(),
      };

      if (currentError) {
        setCurrentError(newError);
        setIsReplacing(true);
        setTimeout(() => {
          setIsReplacing(false);
        }, 200);
      } else {
        setCurrentError(newError);
      }

      setIsVisible(true);
      setIsClosing(false);
    };

    window.addEventListener('globalError', handleError as EventListener);

    return () => {
      window.removeEventListener('globalError', handleError as EventListener);
    };
  }, [currentError]);

  useEffect(() => {
    if (!currentError || isClosing) {
      return;
    }

    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [currentError, isClosing, handleClose]);

  if (!isVisible || !currentError) {
    return null;
  }

  return (
    <div className='fixed top-4 right-4 z-90'>
      <div
        className={`bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between max-w-[calc(100vw-2rem)] transition-all duration-300 ${
          isClosing ? '-translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        } ${
          isReplacing ? 'scale-105 bg-red-400' : 'scale-100 bg-red-500'
        } animate-fade-in`}
      >
        <span className='text-sm font-medium flex-1 mr-3'>
          {currentError.message}
        </span>
        <button
          onClick={handleClose}
          className='text-white hover:text-red-100 transition-colors shrink-0'
          aria-label='关闭错误提示'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function triggerGlobalError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('globalError', {
        detail: { message },
      }),
    );
  }
}
