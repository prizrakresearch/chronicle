"use client";

import { useState } from "react";
import { DitherBackground } from "./dither-background";
import { SplashScreen } from "./splash-screen";

// Module-level flag: false on every hard refresh (module re-evaluates),
// true after the first splash has played. Survives client-side navigation
// because the Next.js App Router layout never unmounts between pages.
let splashDone = false;

// Duration of the overlay fade-out, in ms. Intentionally matches the
// splashReveal keyframe duration in globals.css so they end together.
const REVEAL_MS = 500;

export function ClientBackground() {
  const [splashActive, setSplashActive] = useState<boolean>(() => !splashDone);
  const [revealing, setRevealing] = useState(false);

  function handleSplashDone() {
    splashDone = true;

    // 1. Drop the dither canvas to its resting z-index immediately.
    // 2. Begin fading the black overlay (CSS transition kicks in on next paint).
    // 3. Signal the dashboard wrapper to run its entrance animation.
    setRevealing(true);
    document.documentElement.classList.add("splash-revealed");

    // Remove the overlay element from the DOM once it has fully faded.
    setTimeout(() => setSplashActive(false), REVEAL_MS);
  }

  return (
    <>
      {/*
       * elevated=true  → canvas at z-9997, above dashboard HTML.
       * elevated=false → canvas drops back to z--10 (decorative layer).
       * We drop it as soon as the reveal starts so the dither animation
       * never interferes with the content entrance.
       * rampDurationMs → colour intensity fades in from black over this
       * period.  3 s matches the new 5 s splash: peak at ~3 s, 2 s of
       * full intensity before the splash ends.
       */}
      <DitherBackground
        waveColor={[0.243, 0.251, 0.243]}
        colorNum={2.5}
        waveAmplitude={0.08}
        waveFrequency={6.7}
        waveSpeed={0.05}
        mouseRadius={0.5}
        enableMouseInteraction={true}
        rampDurationMs={3000}
        elevated={splashActive && !revealing}
      />

      {/*
       * Permanent background darkener — always rendered, always behind app
       * content (z: -5) but above the dither canvas (z: -10).  Tones the
       * animated background down so the UI stays legible at all times.
       */}
      <div
        className="fixed left-0 right-0 bottom-0 bg-black pointer-events-none"
        style={{
          top: "calc(-1 * env(safe-area-inset-top, 0px))",
          opacity: 0.80,
          zIndex: -5,
        }}
      />

      {/* 80 % black overlay that sits between the elevated dither canvas
          (z-9997) and the splash text (z-9999). Without this the dither
          is fully visible at full brightness during the splash. */}
      {splashActive && !revealing && (
        <div
          className="fixed inset-0 bg-black pointer-events-none"
          style={{ opacity: 0.80, zIndex: 9998 }}
        />
      )}

      {/* Splash content — wordmark + Prizrak Labs footer. */}
      {splashActive && !revealing && (
        <SplashScreen onDone={handleSplashDone} />
      )}
    </>
  );
}
