import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ConcentricCircles } from "@/components/layout/concentric-circles";
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

export const metadata: Metadata = {
  title: "Chronicle",
  description: "Personal project operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="bg-bokeh fixed inset-0 -z-10" aria-hidden="true" />
          <ConcentricCircles />
          <TooltipProvider>
            <ProjectsProvider>
              <CommandPalette />
              <div className="flex h-screen overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
            </ProjectsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
