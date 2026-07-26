'use client';

/**
 * lib/hooks/useSubmitGuard.js
 *
 * Prevents double-submission of AI calls from rapid button clicks.
 *
 * Usage:
 *   const { guard, isSubmitting } = useSubmitGuard();
 *
 *   // In your handler:
 *   const handleSubmit = guard(async () => {
 *     const res = await fetch('/api/feedback', { ... });
 *     // handle response...
 *   });
 *
 *   // In JSX:
 *   <button onClick={handleSubmit} disabled={isSubmitting}>
 *     {isSubmitting ? 'Submitting...' : 'Submit'}
 *   </button>
 */

import { useCallback, useRef, useState } from 'react';

/**
 * @returns {{ guard: (fn: () => Promise<void>) => () => void, isSubmitting: boolean }}
 */
export function useSubmitGuard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false);

  const guard = useCallback(
    (fn) =>
      async (...args) => {
        if (inFlightRef.current) return; // Already in-flight — silently drop
        inFlightRef.current = true;
        setIsSubmitting(true);
        try {
          await fn(...args);
        } finally {
          inFlightRef.current = false;
          setIsSubmitting(false);
        }
      },
    []
  );

  return { guard, isSubmitting };
}
