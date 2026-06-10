import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import AppShell from "./components/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PsicoDesk",
  description: "Sistema de gestão para clínica psicológica.",
  applicationName: "PsicoDesk",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      {
        url: "/psicodesk-icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: ["/psicodesk-icon.svg"],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "PsicoDesk",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b6f68",
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
                    : saved === "system"
                      ? (prefersLight ? "light" : "dark")
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
