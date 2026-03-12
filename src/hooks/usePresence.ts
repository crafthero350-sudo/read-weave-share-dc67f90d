import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const OFFLINE_THRESHOLD = 60000; // 1 minute

export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const updatePresence = useCallback(async (online: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_presence")
      .upsert({
        user_id: user.id,
        is_online: online,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    // Silently ignore errors
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Go online immediately
    updatePresence(true);

    // Heartbeat
    intervalRef.current = setInterval(() => updatePresence(true), HEARTBEAT_INTERVAL);

    // Go offline on tab close/hide
    const handleVisibility = () => {
      if (document.hidden) {
        updatePresence(false);
      } else {
        updatePresence(true);
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      navigator.sendBeacon?.(url); // Best effort
      updatePresence(false);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updatePresence(false);
    };
  }, [user, updatePresence]);
}

export function isUserOnline(lastSeenAt: string | null, isOnline: boolean): boolean {
  if (!lastSeenAt) return false;
  if (!isOnline) return false;
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  return diff < OFFLINE_THRESHOLD;
}
