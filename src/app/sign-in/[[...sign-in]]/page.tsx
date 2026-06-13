"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const params  = useSearchParams();
  const expired = params.get("expired") === "true";
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
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
            colorBackground: "rgba(0,0,0,0.55)",
            colorInput: "rgba(255,255,255,0.04)",
            colorInputForeground: "rgba(255,255,255,0.8)",
            colorForeground: "rgba(255,255,255,0.75)",
            colorMutedForeground: "rgba(255,255,255,0.35)",
            colorNeutral: "rgba(255,255,255,0.1)",
            borderRadius: "16px",
            fontFamily: "var(--font-geist-sans)",
          },
          elements: {
            card: "border border-white/[0.08] shadow-none backdrop-blur-md",
            headerTitle: "text-white/80",
            headerSubtitle: "text-white/30",
            socialButtonsBlockButton:
              "bg-white/[0.08] border border-white/[0.14] text-white/75 hover:bg-white/[0.13] hover:border-white/25 hover:text-white/90 transition-all",
            socialButtonsBlockButtonText: "font-medium",
            formFieldLabel: "text-white/40 text-xs",
            formFieldInput:
              "bg-white/[0.06] border-white/[0.12] text-white/80 placeholder:text-white/20",
            footerActionText: "text-white/25",
            footerActionLink: "text-primary/70 hover:text-primary",
            dividerText: "text-white/20",
            dividerLine: "border-white/[0.08]",
          },
        }}
      />

      {/* Version + studio credit */}
      <p className="text-xs text-white/20">
        v{version}&nbsp;&nbsp;·&nbsp;&nbsp;Developed by{" "}
        <span
          className="text-white/30 font-bold"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Prizrak Labs
        </span>
      </p>
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
