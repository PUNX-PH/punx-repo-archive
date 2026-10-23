import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { BookmarksProvider } from "@/components/BookmarksProvider";
import { Shell } from "@/components/Shell";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Punx Repo Archive", template: "%s · Punx Repo Archive" },
  description: "Search, ask about, and bookmark GitHub repos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

// Runs before paint so a saved theme and accent color don't flash the defaults.
const themeScript = `try{var d=document.documentElement,t=localStorage.getItem("punx.theme"),a=localStorage.getItem("punx.accent");if(t==="light"||t==="dark")d.setAttribute("data-theme",t);if(a&&a!=="orange")d.setAttribute("data-accent",a)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <AuthProvider>
          <BookmarksProvider>
            <Shell>{children}</Shell>
          </BookmarksProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
