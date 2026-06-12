import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
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
  weight: ["700"],
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
              <div className="h-screen overflow-hidden">
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
      </body>
    </html>
  );
}
