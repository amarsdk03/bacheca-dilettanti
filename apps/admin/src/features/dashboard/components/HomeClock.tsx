"use client";

import {useEffect, useState} from "react";

const formatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome", day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export function HomeClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, []);
  return <time className="home-clock" dateTime={now?.toISOString()}>{now ? formatter.format(now).replace(", ", " - ") : "\u00a0"}</time>;
}
