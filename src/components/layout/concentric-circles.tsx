"use client";

import { useEffect, useState } from "react";

export function ConcentricCircles() {
  const [maxR, setMaxR] = useState(1500);

  useEffect(() => {
    const calc = () => {
      const originX = window.innerWidth * 0.04;
      const originY = window.innerHeight * 0.15;
      const dx = window.innerWidth - originX;
      const dy = window.innerHeight - originY;
      setMaxR(Math.sqrt(dx * dx + dy * dy));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const spacing = maxR / 45;

  return (
    <svg
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none"
      style={{ animation: "circlesFadeIn 2s ease-out forwards" }}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 45 }, (_, i) => {
          const t = i / 44;
          const opacity = 0.015 * Math.pow(1 - t, 1.2);
          return { r: (i + 1) * spacing, opacity };
        }).map(({ r, opacity }) => (
        <circle
          key={r}
          cx="4%"
          cy="15%"
          r={r}
          fill="none"
          stroke={`rgba(163,230,53,${opacity.toFixed(3)})`}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
