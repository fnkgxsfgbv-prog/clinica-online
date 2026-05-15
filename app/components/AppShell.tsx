"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import supabase from "../lib/supabase";

type ThemeMode = "light" | "dark";

type MenuItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

const menuItems: MenuItem[] = [
  {
    href: "/",
    label: "Dashboard",
  },
  {
    href: "/pacientes",
    label: "Pacientes",
    activePaths: ["/pacientes", "/paciente"],
  },
  {
    href: "/agenda",
    label: "Agenda",
  },
  {
    href: "/frequencia",
    label: "Frequência",
  },
  {
    href: "/frequencia/historico",
    label: "Histórico",
  },
  {
    href: "/financeiro",
    label: "Financeiro",
  },
];

const THEME_STORAGE_KEY = "psicodesk-theme";

function isMenuItemActive(pathname: string, item: MenuItem) {
  if (item.href === "/") {
    return pathname === "/";
  }

  const paths = item.activePaths || [item.href];

  return paths.some((path) => pathname.startsWith(path));
}

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>("dark");

  const isLogin = pathname === "/login";

  useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme === "light"
        ? "light"
        : "dark";

    setTheme(currentTheme);
  }, []);

  function atualizarTema(novoTema: ThemeMode) {
    setTheme(novoTema);
    document.documentElement.dataset.theme = novoTema;
    localStorage.setItem(THEME_STORAGE_KEY, novoTema);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/" className="app-brand">
          <span>Psico</span>
          Desk
        </Link>

        <p className="sidebar-section-label">Menu</p>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {menuItems.map((item) => {
            const active = isMenuItemActive(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`menu-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div className="theme-toggle" aria-label="Tema" role="group">
            <button
              type="button"
              className={theme === "light" ? "active" : ""}
              aria-pressed={theme === "light"}
              onClick={() => atualizarTema("light")}
            >
              Claro
            </button>

            <button
              type="button"
              className={theme === "dark" ? "active" : ""}
              aria-pressed={theme === "dark"}
              onClick={() => atualizarTema("dark")}
            >
              Escuro
            </button>
          </div>

          <Link href="/" className="psico-button">
            Início
          </Link>

          <button
            type="button"
            className="psico-button button-danger"
            onClick={sair}
          >
            Sair
          </button>

          <span className="topbar-version">v1.0</span>
        </div>

        {children}
      </main>
    </div>
  );
}
