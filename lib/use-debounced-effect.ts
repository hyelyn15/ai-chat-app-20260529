"use client";

import { useEffect, useRef } from "react";

const SAVE_DEBOUNCE_MS = 400;

export function useDebouncedEffect(
  effect: () => void | Promise<void>,
  deps: unknown[],
  enabled: boolean,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void effect();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
