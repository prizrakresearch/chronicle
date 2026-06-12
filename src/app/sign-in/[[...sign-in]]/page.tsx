"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const params = useSearchParams();
  const expired = params.get("expired") === "true";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
      {/* Wordmark */}
      <div className="mb-2 text-center">
        <h1
          className="text-2xl font-semibold text-white/80 tracking-wide"
          style={{ fontFamily: "'The Seasons', serif" }}
        >
          Chronicle
        </h1>
        <p className="text-xs text-white/25 mt-1">Personal project operating system</p>
      </div>

      {/* Expired notice */}
      {expired && (
        <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
          <p className="text-sm font-medium text-red-400/80">Your guest access has expired.</p>
          <p className="text-xs text-red-400/50 mt-0.5">Contact the owner to renew your invite.</p>
        </div>
      )}

      {/* Clerk sign-in component */}
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#84cc16",
            colorBackground: "#000000",
            colorInput: "#0d0d0d",
            colorInputForeground: "rgba(255,255,255,0.8)",
            colorForeground: "rgba(255,255,255,0.75)",
            colorMutedForeground: "rgba(255,255,255,0.35)",
            colorNeutral: "rgba(255,255,255,0.1)",
            borderRadius: "16px",
            fontFamily: "var(--font-geist-sans)",
          },
          elements: {
            card: "bg-black border border-white/[0.08] shadow-none",
            headerTitle: "text-white/80",
            headerSubtitle: "text-white/30",
            socialButtonsBlockButton:
              "border-white/10 text-white/50 hover:border-white/20 hover:bg-white/[0.04]",
            formFieldLabel: "text-white/40 text-xs",
            formFieldInput:
              "bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/20 focus:border-primary",
            footerActionText: "text-white/25",
            footerActionLink: "text-primary/70 hover:text-primary",
            dividerText: "text-white/20",
            dividerLine: "border-white/[0.08]",
          },
        }}
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
