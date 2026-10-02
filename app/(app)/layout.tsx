"use client";

import { AppProvider } from "@/components/Store";
import Shell from "@/components/Shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
