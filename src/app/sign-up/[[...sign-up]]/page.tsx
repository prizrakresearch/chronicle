import { SignUp } from "@clerk/nextjs";

// This page exists for invited users who arrive via Clerk magic links.
// Public self-sign-up is disabled in the Clerk dashboard, so this is
// unreachable without an explicit invite from the owner.

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
      <div className="mb-2 text-center">
        <h1
          className="text-2xl font-semibold text-white/80 tracking-wide"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Chronicle
        </h1>
        <p className="text-xs text-white/25 mt-1">You&apos;ve been invited — set up your access below.</p>
      </div>

      <SignUp
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
            formFieldLabel: "text-white/40 text-xs",
            formFieldInput:
              "bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/20 focus:border-primary",
            footerActionText: "text-white/25",
            footerActionLink: "text-primary/70 hover:text-primary",
          },
        }}
      />
    </div>
  );
}
