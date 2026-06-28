import { useCallback, useRef, useState } from 'react';

export interface ConfigMessage {
  type: 'success' | 'error';
  text: string;
}

export function useConfigMessage() {
  const [message, setMessage] = useState<ConfigMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage({ type, text });
    timerRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  const clearMessage = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(null);
  }, []);

  return {
    message,
    isLoading,
    setIsLoading,
    showMessage,
    clearMessage,
  };
}
