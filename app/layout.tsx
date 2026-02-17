import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getCurrentUserId } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home Maintenance",
  description: "Track recurring home tasks, due dates, and completion history.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await getCurrentUserId();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <div className="site-shell">
          <header className="topbar">
            <div className="container topbar-inner">
              <Link href="/" className="brand">
                Home Maintenance
              </Link>
              <nav className="nav-links" aria-label="Main navigation">
                <Link href="/tasks">Tasks</Link>
                <Link href="/tasks/new">New Task</Link>
                {userId ? (
                  <form method="post" action="/auth/signout">
                    <button type="submit" className="linkish-btn">
                      Sign out
                    </button>
                  </form>
                ) : (
                  <Link href="/login">Sign in</Link>
                )}
              </nav>
            </div>
          </header>
          <main className="container main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
