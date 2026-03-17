"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Fetches the current time from WorldTimeAPI so it can't be faked
 * by changing the local computer clock. Falls back to local time
 * if the API is unreachable.
 *
 * Returns a Date that ticks every second after the initial fetch.
 */
export function useServerTime(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  const offsetRef = useRef<number>(0); // diff between server time and local clock

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetchServerTime() {
      try {
        const res = await fetch(
          "https://worldtimeapi.org/api/timezone/Etc/UTC",
          { cache: "no-store" }
        );
        const data = await res.json();
        const serverNow = new Date(data.utc_datetime);
        // Store the offset: how far local clock is from real time
        offsetRef.current = serverNow.getTime() - Date.now();
        setNow(serverNow);
      } catch {
        // API unreachable — fall back to local time with 0 offset
        offsetRef.current = 0;
        setNow(new Date());
      }
    }

    fetchServerTime();

    // Tick every second using the offset to stay accurate
    interval = setInterval(() => {
      setNow(new Date(Date.now() + offsetRef.current));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return now;
}
