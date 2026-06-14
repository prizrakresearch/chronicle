"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

const SPLASH_MS  = 5000;
const HALF_MS    = 2500; // when to cross-fade from wordmark → greeting
const FADE_AT_MS = 4500;
const FADE_MS    = SPLASH_MS - FADE_AT_MS; // 500 ms — outer fade duration
const CROSS_MS   = 320;                    // cross-fade between the two phrases

interface SplashScreenProps {
  onDone:         () => void;
  anonymous?:     boolean; // true → use recipientName instead of logged-in user's name
  recipientName?: string;  // name to greet on shared pages (e.g. "Alice"); undefined → "hi"
}

export function SplashScreen({ onDone, anonymous = false, recipientName }: SplashScreenProps) {
  const { user } = useUser();
  const [phase,  setPhase]  = useState<0 | 1>(0); // 0 = wordmark, 1 = greeting
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Always cross-fade to greeting — on share pages we say "hi [name]" or just "hi"
    const halfTimer = setTimeout(() => setPhase(1), HALF_MS);
    const fadeTimer = setTimeout(() => setFading(true), FADE_AT_MS);
    const doneTimer = setTimeout(onDone, SPLASH_MS);
    return () => {
      clearTimeout(halfTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Owner's session → Clerk name; shared page → recipientName (may be null → just "hi")
  const displayName = anonymous
    ? (recipientName ?? null)
    : (user?.firstName ?? user?.username ?? "there");

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
      style={{ zIndex: 9999 }}
    >
      {/* ── Centre: wordmark / greeting cross-fade ── */}
      <div
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      >
        {/*
         * CSS-grid trick: both spans share the same grid cell so they
         * perfectly overlap without layout shift.
         */}
        <div className="grid text-center">
          {/* Phase 0 — "Chronicle" wordmark */}
          <span
            className="[grid-area:1/1] font-semibold text-white/80"
            style={{
              fontSize: "0.9625rem",
              opacity: phase === 0 ? 1 : 0,
              transition: `opacity ${CROSS_MS}ms ease-in-out`,
            }}
          >
            Chronicle
          </span>

          {/* Phase 1 — greeting: "hi, [name]" or just "hi" */}
          <span
            className="[grid-area:1/1] font-light text-white/55"
            style={{
              fontSize: "0.9625rem",
              opacity: phase === 1 ? 1 : 0,
              transition: `opacity ${CROSS_MS}ms ease-in-out`,
            }}
          >
            {displayName ? (
              <>hi,{" "}<span className="font-semibold text-white/85">{displayName}</span></>
            ) : (
              <>hi</>
            )}
          </span>
        </div>
      </div>

      {/* ── Bottom watermark: Prizrak Labs ── */}
      <div
        className="absolute bottom-8 left-0 right-0 flex justify-center"
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      >
        <span
          className="text-sm text-white/25 tracking-wide"
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle:  "normal",
            fontWeight: 700,
          }}
        >
          Prizrak Labs
        </span>
      </div>
    </div>
  );
}
