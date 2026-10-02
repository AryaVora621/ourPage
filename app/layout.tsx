import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ourPage",
  description: "Our shared calendar, notes, and little love counters.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f97316" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
