import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ClientBackground } from "@/components/layout/client-background";
import { ProjectsProvider } from "@/lib/store/projects-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/search/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  style:   ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Chronicle",
    template: "%s",
  },
  description: "Personal project operating system",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png",   sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-32.png",
  },
  appleWebApp: {
    capable: true,
    title: "Chronicle",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* The Seasons — decorative serif used for the splash "C" mark */}
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/the-seasons" />
      </head>
      <body className="text-foreground antialiased">
        <ClerkProvider appearance={{
          variables: {
            colorBackground:      "#09090b",
            colorInput:           "#18181b",
            colorInputForeground: "#f4f4f5",
            colorForeground:      "rgba(255,255,255,0.85)",
            colorMutedForeground: "rgba(255,255,255,0.40)",
            colorPrimary:         "#a3e635",
            colorDanger:          "#f87171",
            colorNeutral:         "#ffffff",
            colorBorder:          "rgba(255,255,255,0.08)",
            colorModalBackdrop:   "rgba(0,0,0,0.27)",
            borderRadius:         "0.625rem",
            fontFamily:           "var(--font-geist-sans), -apple-system, sans-serif",
            fontSize:             "0.875rem",
          },
          elements: {
            // ── Modal shell ──────────────────────────────────────────────────
            card: {
              backgroundColor: "#09090b",
              border:          "1px solid rgba(255,255,255,0.08)",
              borderRadius:    "1rem",
              boxShadow:       "0 25px 50px -12px rgba(0,0,0,0.9)",
            },
            modalBackdrop: {
              backgroundColor: "rgba(0,0,0,0.20)",
              backdropFilter:  "blur(6px)",
            },
            // ── Left nav sidebar ─────────────────────────────────────────────
            navbar: {
              backgroundColor: "rgba(255,255,255,0.015)",
              borderRight:     "1px solid rgba(255,255,255,0.06)",
              borderRadius:    "1rem 0 0 1rem",
            },
            navbarButton: {
              color:        "rgba(255,255,255,0.45)",
              borderRadius: "0.625rem",
              fontSize:     "0.8125rem",
            },
            navbarButtonIcon: { color: "rgba(255,255,255,0.30)" },
            // ── Section headers ──────────────────────────────────────────────
            profileSectionTitle: {
              borderBottom:  "1px solid rgba(255,255,255,0.06)",
              paddingBottom: "0.5rem",
              marginBottom:  "0.75rem",
            },
            profileSectionTitleText: {
              fontSize:      "0.6875rem",
              fontWeight:    "600",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color:         "rgba(255,255,255,0.28)",
            },
            // ── Form fields ──────────────────────────────────────────────────
            formFieldLabel: { color: "rgba(255,255,255,0.45)", fontSize: "0.75rem" },
            formFieldInput: {
              border:       "1px solid rgba(63,63,70,0.9)",
              borderRadius: "0.75rem",
            },
            // ── Buttons ──────────────────────────────────────────────────────
            formButtonPrimary: {
              backgroundColor: "#f4f4f5",
              color:           "#09090b",
              borderRadius:    "999px",
              fontWeight:      "600",
              fontSize:        "0.8125rem",
              boxShadow:       "none",
            },
            formButtonReset: {
              color:        "rgba(255,255,255,0.40)",
              borderRadius: "999px",
              fontSize:     "0.8125rem",
            },
            // ── Connected accounts / badges ───────────────────────────────────
            badge: {
              backgroundColor: "rgba(255,255,255,0.06)",
              color:           "rgba(255,255,255,0.45)",
              borderRadius:    "999px",
            },
            // ── Avatar upload button ──────────────────────────────────────────
            avatarImageActionsUpload: {
              color:           "#f4f4f5",
              borderRadius:    "0.75rem",
              border:          "1px dashed rgba(255,255,255,0.15)",
              backgroundColor: "transparent",
            },
            // ── Hide "Secured by Clerk" footer ────────────────────────────────
            footer: { display: "none" },
          },
        }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Dither canvas + black overlay + splash screen (coordinates z-index) */}
          <ClientBackground />
          <TooltipProvider>
            <ProjectsProvider>
              <CommandPalette />
              <div className="h-screen overflow-hidden splash-reveal-target">
                <main className="h-full overflow-hidden">
                  {children}
                </main>
                {/* blur fade — sits above scroll, below bar text */}
                <div
                  className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none z-10"
                  style={{
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    maskImage: "linear-gradient(to top, black 0%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)",
                  }}
                />
                {/* bottom bar — fixed on top */}
                <div className="fixed bottom-0 left-0 right-0 z-20 px-6 py-3 flex items-center justify-center gap-2 text-xs text-white/25">
                  <span>v0.1.0</span>
                  <span className="text-white/15">|</span>
                  <span>Developed by <span className="font-bold text-white/35" style={{ fontFamily: "var(--font-playfair)" }}>Prizrak Labs</span></span>
                </div>
              </div>
            </ProjectsProvider>
          </TooltipProvider>
        </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
