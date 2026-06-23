"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_PROGRESS = 8;
const MAX_PROGRESS = 92;
const COMPLETE_PROGRESS = 100;
const STEP_INTERVAL_MS = 180;
const HIDE_DELAY_MS = 220;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function GlobalRouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const progressTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const isPendingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isPendingRef.current) {
      return;
    }

    clearTimers();
    isPendingRef.current = true;

    // Defer state updates to avoid useInsertionEffect violation in React 19
    Promise.resolve().then(() => {
      setVisible(true);
      setProgress(START_PROGRESS);
    });

    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= MAX_PROGRESS) {
          return current;
        }

        const step = Math.max(1, (MAX_PROGRESS - current) * 0.15);
        return Math.min(MAX_PROGRESS, current + step);
      });
    }, STEP_INTERVAL_MS);
  }, [clearTimers]);

  const complete = useCallback(() => {
    if (!isPendingRef.current) {
      return;
    }

    isPendingRef.current = false;

    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    setProgress(COMPLETE_PROGRESS);

    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    complete();
  }, [routeKey, complete]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || isModifiedClick(event)) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      if (destination.origin !== current.origin) {
        return;
      }

      if (destination.pathname === current.pathname && destination.search === current.search) {
        return;
      }

      start();
    };

    const handlePopState = () => {
      start();
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
      start();
      return originalPushState(...args);
    }) as History["pushState"];

    window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
      start();
      return originalReplaceState(...args);
    }) as History["replaceState"];

    window.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      clearTimers();
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [clearTimers, start]);

  return (
    <div
      aria-hidden="true"
      className={`global-route-progress ${visible ? "is-visible" : ""}`}
    >
      <div
        className="global-route-progress__bar"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
