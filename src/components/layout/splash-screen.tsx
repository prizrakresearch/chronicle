"use client";

import { useState, useEffect } from "react";

const SPLASH_MS  = 10000;
const FADE_AT_MS = 9500;
const FADE_MS    = SPLASH_MS - FADE_AT_MS; // 500 ms

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), FADE_AT_MS);
    const doneTimer = setTimeout(onDone, SPLASH_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
      style={{ zIndex: 9999 }}
    >
      <div
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
        className="flex items-center justify-center"
      >
        {/* Wordmark — same style as the topbar heading */}
        <span className="font-semibold text-white/80" style={{ fontSize: "0.9625rem" }}>Chronicle</span>
      </div>
    </div>
  );
}
