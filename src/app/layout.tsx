import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";
import { BookmarksProvider } from "@/components/BookmarksProvider";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Punx Repo Archive",
  description: "Search, ask about, and bookmark GitHub repos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <BookmarksProvider>
            <header className="topbar">
              <Link href="/" className="logo">punx<span>/archive</span></Link>
            </header>
            <main className="page">{children}</main>
            <TabBar />
          </BookmarksProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
