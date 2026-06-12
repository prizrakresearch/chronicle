"use client";

import { useState } from "react";
import { DitherBackground } from "./dither-background";
import { SplashScreen } from "./splash-screen";

// Module-level flag: false on every hard refresh (module re-evaluates),
// true after the first splash has played. Survives client-side navigation
// because the Next.js App Router layout never unmounts between pages.
let splashDone = false;

export function ClientBackground() {
  const [splashActive, setSplashActive] = useState<boolean>(() => !splashDone);

  function handleSplashDone() {
    splashDone = true;
    setSplashActive(false);
  }

  return (
    <>
      {/*
       * During splash  → elevated=true  puts the canvas at z-9997, above the
       *   dashboard HTML, so only the dither animation (+ overlay below) is
       *   visible through the transparent splash layer.
       * After splash   → elevated=false drops it back to z--10 (normal).
       * rampDurationMs → only meaningful during the splash phase; after that
       *   the canvas is already at full intensity so the value doesn't matter.
       */}
      <DitherBackground
        waveColor={[0.243, 0.251, 0.243]}
        colorNum={2.5}
        waveAmplitude={0.08}
        waveFrequency={6.7}
        waveSpeed={0.05}
        mouseRadius={0.5}
        enableMouseInteraction={true}
        rampDurationMs={7000}
        elevated={splashActive}
      />

      {/* 80 % black overlay — raised alongside the canvas during splash */}
      <div
        className="fixed inset-0 bg-black pointer-events-none"
        style={{ opacity: 0.8, zIndex: splashActive ? 9998 : -5 }}
      />

      {/* Logo + wordmark overlay — topmost layer, only during splash */}
      {splashActive && <SplashScreen onDone={handleSplashDone} />}
    </>
  );
}
