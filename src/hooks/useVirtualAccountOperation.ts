import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiBaseUrl } from "@/services/apiClient";
import { POLL_DELAYS, VirtualAccountLifecycle } from "@/lib/virtualAccountLifecycle";
import { scopeStorageKey, type VirtualAccountRequestSnapshot } from "@/lib/virtualAccountOperation";

export function useVirtualAccountOperation() {
  const { user, token } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const lifecycle = useMemo(() => userId && token ? new VirtualAccountLifecycle({
    environment: apiBaseUrl ? new URL(apiBaseUrl, window.location.origin).href.replace(/\/$/, "") : "",
    userId: String(userId), providerCode: "nium",
  }, token) : null, [userId, token]);
  const [, render] = useState(0);
  const [revision, setRevision] = useState(0);
  const [pollingPaused, setPollingPaused] = useState("");

  useEffect(() => {
    if (!lifecycle) return;
    lifecycle.setActive(true);
    const unsubscribe = lifecycle.subscribe(() => {
      render((value) => value + 1);
      if (lifecycle.state.ready) {
        client.setQueryData(["nium-virtual-accounts", userId, "nium", token], lifecycle.state.accounts);
      }
    });
    return () => { lifecycle.setActive(false); unsubscribe(); };
  }, [lifecycle, client, userId, token]);

  useEffect(() => {
    if (!lifecycle) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    let running = false;
    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (!disposed) timer = setTimeout(() => { void tick(); }, delay);
    };
    const tick = async () => {
      if (disposed || running) return;
      if (!navigator.onLine || document.visibilityState === "hidden") {
        setPollingPaused(!navigator.onLine ? "Status checks paused while offline." : "Status checks paused while this page is hidden.");
        return;
      }
      if (lifecycle.state.authorizationPaused) {
        setPollingPaused("Status checks paused. Sign in with the authorized account.");
        return;
      }
      if (attempts > POLL_DELAYS.length) {
        setPollingPaused("Automatic status checks paused. Use Check status to continue.");
        return;
      }
      running = true;
      setPollingPaused("");
      await lifecycle.refresh();
      running = false;
      if (disposed) return;
      if (lifecycle.state.authorizationPaused) {
        setPollingPaused("Status checks paused. Sign in with the authorized account.");
      } else if (lifecycle.needsPolling) {
        const delay = POLL_DELAYS[attempts++];
        if (delay === undefined) setPollingPaused("Automatic status checks paused. Use Check status to continue.");
        else schedule(delay);
      }
    };
    const wake = () => schedule(0);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === scopeStorageKey(lifecycle.context) || event.key === null) wake();
    };
    window.addEventListener("online", wake);
    window.addEventListener("offline", wake);
    window.addEventListener("storage", storageChanged);
    document.addEventListener("visibilitychange", wake);
    schedule(0);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("online", wake);
      window.removeEventListener("offline", wake);
      window.removeEventListener("storage", storageChanged);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [lifecycle, revision]);

  const refresh = useCallback(async () => {
    if (!lifecycle) return;
    if (navigator.onLine && document.visibilityState !== "hidden") await lifecycle.refresh(true);
    setRevision((value) => value + 1);
  }, [lifecycle]);

  const submit = useCallback(async (request: VirtualAccountRequestSnapshot, accountId: number) => {
    if (!lifecycle || !navigator.onLine || document.visibilityState === "hidden") throw new Error("Connect and keep this page visible before submitting.");
    try { return await lifecycle.submit(request, accountId); }
    finally { setRevision((value) => value + 1); }
  }, [lifecycle]);

  return { state: lifecycle?.state, blocked: !lifecycle || lifecycle.blocked, pollingPaused, refresh, submit };
}
