"use client";

import "./globals.css";

import Link from "next/link";
import { usePathname } from "next/navigation";

import supabase from "./lib/supabase";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isLogin = pathname === "/login";

  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>
        {isLogin ? (
          children
        ) : (
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              color: "#f8fafc",
            }}
          >
            <aside>
              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  marginBottom: "42px",
                  letterSpacing: "-1px",
                }}
              >
                <span style={{ color: "#4ade80" }}>
                  Psico
                </span>
                Desk
              </h1>

              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.72rem",
                  marginBottom: "18px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Menu
              </p>

              <nav
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Link href="/" className="menu-link">
                  Dashboard
                </Link>

                <Link
                  href="/pacientes"
                  className="menu-link"
                >
                  Pacientes
                </Link>

                <Link
                  href="/agenda"
                  className="menu-link"
                >
                  Agenda
                </Link>

                <Link
                  href="/frequencia"
                  className="menu-link"
                >
                  Frequência
                </Link>

                <Link
                  href="/frequencia/historico"
                  className="menu-link"
                >
                  Histórico
                </Link>
              </nav>
            </aside>

            <main className="main-content">
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "28px",
                }}
              >
                <Link
                  href="/"
                  className="psico-button"
                >
                  Início
                </Link>

                <button
                  className="psico-button"
                  onClick={async () => {
                    await supabase.auth.signOut();

                    window.location.href =
                      "/login";
                  }}
                  style={{
                    border:
                      "1px solid rgba(239,68,68,0.22)",

                    color: "#fecaca",
                  }}
                >
                  Sair
                </button>

                <span
                  style={{
                    color: "#475569",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  v1.0
                </span>
              </div>

              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  );
}