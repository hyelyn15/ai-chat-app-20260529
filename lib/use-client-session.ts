"use client";

import { useEffect, useState } from "react";

import { getClientSession } from "@/lib/client-session";

export function useClientSession() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getClientSession()
      .then((id) => {
        if (cancelled) return;
        setClientId(id);
        setIsReady(true);
      })
      .catch((sessionError) => {
        if (cancelled) return;
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "클라이언트 세션을 시작하지 못했습니다.",
        );
        setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { clientId, isReady, error };
}
