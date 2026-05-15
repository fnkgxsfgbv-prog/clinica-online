import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import AppShell from "./components/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PsicoDesk",
  description: "Sistema de gestão para clínica psicológica.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var key = "psicodesk-theme";
                  var saved = localStorage.getItem(key);
                  var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
                  var theme = saved === "light" || saved === "dark"
                    ? saved
                    : prefersLight
                      ? "light"
                      : "dark";

                  document.documentElement.dataset.theme = theme;
                } catch (error) {
                  document.documentElement.dataset.theme = "dark";
                }
              })();
            `,
          }}
        />
      </head>

      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
