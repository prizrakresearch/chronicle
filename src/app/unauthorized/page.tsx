// Shown when a signed-in user has no role in their metadata.
// This happens if public sign-ups are accidentally re-enabled and
// someone creates an account without being invited.

import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1
        className="text-2xl font-semibold text-white/80"
        style={{ fontFamily: "'The Seasons', serif" }}
      >
        Chronicle
      </h1>
      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-5 max-w-sm">
        <p className="text-sm font-semibold text-red-400/80">Access not granted</p>
        <p className="text-xs text-red-400/40 mt-1.5 leading-relaxed">
          Your account exists but hasn&apos;t been given access to this app.
          Contact the owner to get your account approved.
        </p>
      </div>
      <Link
        href="/sign-in"
        className="mt-2 text-xs text-white/25 hover:text-white/50 transition"
      >
        ← Back to sign in
      </Link>
    </div>
  );
}
