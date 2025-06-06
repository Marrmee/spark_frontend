import { useRef, useCallback } from "react";

/**
 * Throttle a function to prevent it from being called more than once in a given time frame
 * @param callback The function to throttle
 * @param delay The time frame in milliseconds
 * @returns A throttled version of the function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRan = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const handler = () => {
        if (Date.now() - lastRan.current >= delay) {
          callback(...args);
          lastRan.current = Date.now();
        } else {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            callback(...args);
            lastRan.current = Date.now();
          }, delay - (Date.now() - lastRan.current));
        }
      };

      handler();
    },
    [callback, delay]
  );
}
