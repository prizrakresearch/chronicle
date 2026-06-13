"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const params  = useSearchParams();
  const expired = params.get("expired") === "true";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      {/* Expired notice */}
      {expired && (
        <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
          <p className="text-sm font-medium text-red-400/80">Your guest access has expired.</p>
          <p className="text-xs text-red-400/50 mt-0.5">Contact the owner to renew your invite.</p>
        </div>
      )}

      <SignIn
        appearance={{
          layout: {
            // Force full "Continue with Google / Apple" label, never icon-only
            socialButtonsVariant: "blockButton",
          },
          variables: {
            colorPrimary: "#84cc16",
            colorBackground: "rgba(0,0,0,0.55)",
            colorInput: "rgba(255,255,255,0.06)",
            colorInputForeground: "rgba(255,255,255,0.8)",
            colorForeground: "rgba(255,255,255,0.80)",
            colorMutedForeground: "rgba(255,255,255,0.40)",
            colorNeutral: "rgba(255,255,255,0.15)",
            borderRadius: "16px",
            fontFamily: "var(--font-geist-sans)",
          },
          elements: {
            card: "border border-white/[0.10] shadow-none backdrop-blur-md",
            headerTitle: "text-white/85 font-semibold",
            headerSubtitle: "text-white/35",
            // Social buttons — visible background, clear text
            socialButtonsBlockButton:
              "bg-white/[0.10] border border-white/[0.18] text-white/80 font-medium hover:bg-white/[0.16] hover:border-white/30 hover:text-white transition-all duration-150",
            socialButtonsBlockButtonText: "font-medium text-[0.8125rem]",
            formFieldLabel: "text-white/45 text-xs",
            formFieldInput:
              "bg-white/[0.06] border-white/[0.12] text-white/80 placeholder:text-white/25",
            footerActionText: "text-white/25",
            footerActionLink: "text-lime-400/70 hover:text-lime-400",
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
