import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-inter", // keeping variable name to match globals.css without breaking other things
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-jakarta", // keeping variable name
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeComm AI — AI-Powered Code Commenter",
  description:
    "Generate comprehensive JSDoc-style comments for your GitHub repositories with AI, and automatically raise pull requests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${outfit.variable}`}>
      <body className="antialiased bg-[#000000] text-white min-h-screen selection:bg-emerald-500/30 font-sans" suppressHydrationWarning>

        <main className="relative z-10 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
