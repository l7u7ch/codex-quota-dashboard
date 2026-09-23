import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Codex Quota Dashboard",
  description: "複数のChatGPTアカウントのCodex利用枠を可視化します。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja" className="dark">
      <body>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
