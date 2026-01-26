// frontend/src/hooks/useSilenceDetection.ts
import { useRef, useCallback, useEffect } from 'react';

interface UseSilenceDetectionOptions {
  timeoutMs: number;
  onTimeout: () => void;
  enabled: boolean;
}

export function useSilenceDetection({
  timeoutMs,
  onTimeout,
  enabled,
}: UseSilenceDetectionOptions) {
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    lastActivityRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs) {
        onTimeout();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, timeoutMs, onTimeout]);

  return { resetTimer };
}
