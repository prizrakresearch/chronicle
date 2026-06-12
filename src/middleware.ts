import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/unauthorized",
]);

export default clerkMiddleware(async (auth, req) => {
  // Let public routes through without any checks
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, redirectToSignIn, sessionClaims } = await auth();

  // Not signed in → send to sign-in page
  if (!userId) return redirectToSignIn();

  // Read role from the custom session claim "metadata" (set via Clerk dashboard
  // session token customization: { "metadata": "{{user.public_metadata}}" })
  const meta = (sessionClaims?.metadata ?? {}) as {
    role?: string;
    expiresAt?: string;
  };

  // Signed in but has no role → self-signup without an invite
  if (!meta.role) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Guest whose access window has closed
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    return NextResponse.redirect(new URL("/sign-in?expired=true", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
