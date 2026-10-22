import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";
import { BookmarksProvider } from "@/components/BookmarksProvider";
import { TabBar } from "@/components/TabBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Punx Repo Archive", template: "%s · Punx Repo Archive" },
  description: "Search, ask about, and bookmark GitHub repos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
};

// Runs before paint so a saved light/dark choice doesn't flash the wrong theme.
const themeScript = `try{var t=localStorage.getItem("punx.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <AuthProvider>
          <BookmarksProvider>
            <header className="topbar">
              <Link href="/" className="logo">punx<span>/archive</span></Link>
              <ThemeToggle />
            </header>
            <main id="main" className="page">{children}</main>
            <TabBar />
          </BookmarksProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
