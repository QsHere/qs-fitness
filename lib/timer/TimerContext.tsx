"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  playCompletionSound,
  startKeepAlive,
  stopKeepAlive,
  vibrateIfSupported,
} from "@/lib/timer/sound";

const STORAGE_KEY = "qsf_rest_timer";
const TICK_MS = 250;

type TimerStatus = "idle" | "running" | "paused" | "completed";

interface PersistedTimer {
  status: TimerStatus;
  durationMs: number;
  endAt: number | null; // epoch ms, only meaningful while running
  pausedRemainingMs: number | null;
}

interface TimerContextValue {
  status: TimerStatus;
  durationMs: number;
  remainingMs: number;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  addSeconds: (delta: number) => void;
  dismissCompleted: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

function load(): PersistedTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedTimer;
  } catch {
    return null;
  }
}

function save(data: PersistedTimer) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can fail (private browsing, full quota) - the timer still
    // works for this session, it just won't survive a full reload.
  }
}

function clear() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function notifyServiceWorker(title: string, body: string) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({ type: "TIMER_COMPLETE", title, body });
    })
    .catch(() => {
      // Service worker not available - sound/vibration still fire below.
    });
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);

  const endAtRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number | null>(null);
  const hasFiredCompletionRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persist = useCallback((next: PersistedTimer) => {
    if (next.status === "idle") clear();
    else save(next);
  }, []);

  const fireCompletion = useCallback(() => {
    if (hasFiredCompletionRef.current) return;
    hasFiredCompletionRef.current = true;
    stopKeepAlive();
    playCompletionSound();
    vibrateIfSupported([200, 100, 200, 100, 400]);
    notifyServiceWorker("Rest complete", "Time for your next set.");
    setStatus("completed");
    endAtRef.current = null;
    persist({ status: "completed", durationMs, endAt: null, pausedRemainingMs: null });
  }, [durationMs, persist]);

  // Rehydrate from a previous session (survives a full reload/relaunch, not
  // just switching apps - covers the harsher case where the OS fully
  // discards the page's memory while backgrounded).
  useEffect(() => {
    const saved = load();
    if (!saved) return;
    if (saved.status === "running" && saved.endAt) {
      const remaining = saved.endAt - Date.now();
      if (remaining <= 0) {
        setDurationMs(saved.durationMs);
        fireCompletion();
      } else {
        setDurationMs(saved.durationMs);
        setRemainingMs(remaining);
        endAtRef.current = saved.endAt;
        setStatus("running");
        startKeepAlive();
      }
    } else if (saved.status === "paused" && saved.pausedRemainingMs != null) {
      setDurationMs(saved.durationMs);
      setRemainingMs(saved.pausedRemainingMs);
      pausedRemainingRef.current = saved.pausedRemainingMs;
      setStatus("paused");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The tick loop - always recomputes from the absolute end timestamp rather
  // than decrementing, so throttling/suspension while backgrounded can never
  // cause drift: whenever this does get to run, it's still exactly correct.
  useEffect(() => {
    if (status !== "running") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (!endAtRef.current) return;
      const remaining = endAtRef.current - Date.now();
      if (remaining <= 0) {
        setRemainingMs(0);
        fireCompletion();
      } else {
        setRemainingMs(remaining);
      }
    }, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, fireCompletion]);

  // Catch-up the instant the tab becomes visible again, rather than waiting
  // for the next throttled tick.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (status === "running" && endAtRef.current) {
        const remaining = endAtRef.current - Date.now();
        if (remaining <= 0) {
          setRemainingMs(0);
          fireCompletion();
        } else {
          setRemainingMs(remaining);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status, fireCompletion]);

  const start = useCallback(
    (seconds: number) => {
      const ms = seconds * 1000;
      const endAt = Date.now() + ms;
      hasFiredCompletionRef.current = false;
      endAtRef.current = endAt;
      pausedRemainingRef.current = null;
      setDurationMs(ms);
      setRemainingMs(ms);
      setStatus("running");
      startKeepAlive();

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission().catch(() => {});
      }
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }

      persist({ status: "running", durationMs: ms, endAt, pausedRemainingMs: null });
    },
    [persist]
  );

  const pause = useCallback(() => {
    if (status !== "running" || !endAtRef.current) return;
    const remaining = Math.max(0, endAtRef.current - Date.now());
    pausedRemainingRef.current = remaining;
    endAtRef.current = null;
    setRemainingMs(remaining);
    setStatus("paused");
    stopKeepAlive();
    persist({ status: "paused", durationMs, endAt: null, pausedRemainingMs: remaining });
  }, [status, durationMs, persist]);

  const resume = useCallback(() => {
    if (status !== "paused" || pausedRemainingRef.current == null) return;
    const endAt = Date.now() + pausedRemainingRef.current;
    endAtRef.current = endAt;
    pausedRemainingRef.current = null;
    setStatus("running");
    startKeepAlive();
    persist({ status: "running", durationMs, endAt, pausedRemainingMs: null });
  }, [status, durationMs, persist]);

  const cancel = useCallback(() => {
    stopKeepAlive();
    endAtRef.current = null;
    pausedRemainingRef.current = null;
    hasFiredCompletionRef.current = false;
    setStatus("idle");
    setDurationMs(0);
    setRemainingMs(0);
    persist({ status: "idle", durationMs: 0, endAt: null, pausedRemainingMs: null });
  }, [persist]);

  const addSeconds = useCallback(
    (delta: number) => {
      const deltaMs = delta * 1000;
      if (status === "running" && endAtRef.current) {
        const newEndAt = Math.max(Date.now(), endAtRef.current + deltaMs);
        endAtRef.current = newEndAt;
        const newDuration = Math.max(0, durationMs + deltaMs);
        setDurationMs(newDuration);
        setRemainingMs(Math.max(0, newEndAt - Date.now()));
        persist({
          status: "running",
          durationMs: newDuration,
          endAt: newEndAt,
          pausedRemainingMs: null,
        });
      } else if (status === "paused" && pausedRemainingRef.current != null) {
        const newRemaining = Math.max(0, pausedRemainingRef.current + deltaMs);
        pausedRemainingRef.current = newRemaining;
        const newDuration = Math.max(0, durationMs + deltaMs);
        setDurationMs(newDuration);
        setRemainingMs(newRemaining);
        persist({
          status: "paused",
          durationMs: newDuration,
          endAt: null,
          pausedRemainingMs: newRemaining,
        });
      }
    },
    [status, durationMs, persist]
  );

  const dismissCompleted = useCallback(() => {
    hasFiredCompletionRef.current = false;
    setStatus("idle");
    setDurationMs(0);
    setRemainingMs(0);
    clear();
  }, []);

  return (
    <TimerContext.Provider
      value={{
        status,
        durationMs,
        remainingMs,
        start,
        pause,
        resume,
        cancel,
        addSeconds,
        dismissCompleted,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
