"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState, type ReactNode } from "react";

import { getCurrentUser } from "../lib/auth";
import { buscarPacientesPorNome } from "../lib/db/pacientes";
import { resolverUrlFotoPerfil } from "../lib/db/profile-photo";
import {
  THEME_STORAGE_KEY,
  type TemaPreferencia,
} from "../lib/preferencias";
import supabase from "../lib/supabase";
import type { Paciente } from "../types";
import { MenuIcon, type MenuIconName } from "./MenuIcons";
import {
  PreferenciasProvider,
  usePreferenciasOpcional,
} from "./PreferenciasProvider";

type ThemeMode = "light" | "dark";

type MenuItem = {
  href: string;
  label: string;
  icon: MenuIconName;
  activePaths?: string[];
};

const menuItems: MenuItem[] = [
  {
    href: "/",
    label: "Painel",
    icon: "painel",
  },
  {
    href: "/pacientes",
    label: "Pacientes",
    icon: "pacientes",
    activePaths: ["/pacientes", "/paciente"],
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: "agenda",
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: "financeiro",
  },
  {
    href: "/modelos",
    label: "Documentos",
    icon: "documentos",
  },
  {
    href: "/frequencia",
    label: "Frequência",
    icon: "frequencia",
    activePaths: ["/frequencia"],
  },
  {
    href: "/minha-clinica",
    label: "Minha clínica",
    icon: "clinica",
    activePaths: ["/minha-clinica", "/preferencias"],
  },
];

const routeTitles: Array<[string, string]> = [
  ["/modelos", "Documentos"],
  ["/novo-paciente", "Novo paciente"],
  ["/frequencia/historico", "Frequência"],
  ["/frequencia", "Frequência"],
  ["/financeiro", "Financeiro"],
  ["/agenda", "Agenda"],
  ["/pacientes", "Pacientes"],
  ["/paciente", "Paciente"],
  ["/sessao", "Sessão"],
  ["/minha-clinica/pendencias", "Pendências"],
  ["/minha-clinica", "Minha clínica"],
  ["/preferencias", "Minha clínica"],
];

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

  const isAuthLayout =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/privacidade" ||
    pathname === "/termos";

  if (isAuthLayout) {
    return <>{children}</>;
  }

  return (
    <PreferenciasProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </PreferenciasProvider>
  );
}

function AppShellFrame({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const preferenciasCtx = usePreferenciasOpcional();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [resultadosBusca, setResultadosBusca] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState("");
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme === "light"
        ? "light"
        : "dark";

    setTheme(currentTheme);
  }, []);

  useEffect(() => {
    if (!preferenciasCtx?.preferencias.tema) return;
    setTheme(preferenciasCtx.preferencias.tema);
  }, [preferenciasCtx?.preferencias.tema]);

  useEffect(() => {
    async function aplicarUsuario(user: User) {
      setUserEmail(user.email || "");
      setProfilePhotoUrl(await resolverUrlFotoPerfil(user.user_metadata || {}));

    }

    async function carregarUsuario() {
      const user = await getCurrentUser();
      if (!user) return;
      await aplicarUsuario(user);
    }

    void carregarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void aplicarUsuario(session.user);
      } else {
        setUserEmail("");
        setProfilePhotoUrl("");
        setResultadosBusca([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultadosBusca([]);
      setBuscandoPacientes(false);
      return;
    }

    setBuscandoPacientes(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const user = await getCurrentUser();
        if (!user) {
          setBuscandoPacientes(false);
          return;
        }

        const { data, error } = await buscarPacientesPorNome(user.id, termo);
        if (!error) {
          setResultadosBusca((data || []) as Paciente[]);
        }
        setBuscandoPacientes(false);
      })();
    }, 280);

    return () => window.clearTimeout(timer);
  }, [busca]);

  function atualizarTema(novoTema: ThemeMode) {
    setTheme(novoTema);
    document.documentElement.dataset.theme = novoTema;
    localStorage.setItem(THEME_STORAGE_KEY, novoTema);
    void preferenciasCtx?.atualizarPreferencias(
      { tema: novoTema as TemaPreferencia },
      { salvarNuvem: true }
    );
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const pacientesFiltrados = resultadosBusca;

  const tituloPagina =
    menuItems.find((item) => isMenuItemActive(pathname, item))?.label ||
    routeTitles.find(([path]) => pathname.startsWith(path))?.[1] ||
    "Painel";

  const inicialUsuario = (userEmail || "P").slice(0, 1).toUpperCase();

  return (
    <div className="app-shell psicomanager-shell">
      <aside className="app-sidebar psicomanager-sidebar">
        <Link href="/" className="app-brand psicomanager-brand">
          <span>Psico</span>Desk
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
                <span className="menu-icon" aria-hidden="true">
                  <MenuIcon name={item.icon} />
                </span>
                <span className="menu-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main-content psicomanager-main">
        <div className="topbar psicomanager-topbar">
          <div className="topbar-left">
            <span className="topbar-page-pill">{tituloPagina}</span>
            <div className="topbar-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar paciente"
              />
              {busca.trim().length >= 2 ? (
                <div className="topbar-search-results">
                  {buscandoPacientes ? (
                    <p className="topbar-search-hint">Buscando…</p>
                  ) : pacientesFiltrados.length === 0 ? (
                    <p className="topbar-search-hint">Nenhum paciente encontrado.</p>
                  ) : null}
                  {pacientesFiltrados.map((paciente) => (
                    <button
                      key={paciente.id}
                      type="button"
                      onClick={() => {
                        setBusca("");
                        router.push(`/paciente/${paciente.id}`);
                      }}
                    >
                      {paciente.nome}
                    </button>
                  ))}
                </div>
              ) : busca.trim().length === 1 ? (
                <p className="topbar-search-hint">Digite pelo menos 2 letras.</p>
              ) : null}
            </div>
          </div>

          <div className="profile-menu-wrap">
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
            >
              <span className="profile-avatar">
                {profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePhotoUrl} alt="Foto do perfil" />
                ) : (
                  inicialUsuario
                )}
              </span>
              <span className="profile-caret">⌄</span>
            </button>

            {profileOpen ? (
              <div className="profile-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    atualizarTema(theme === "dark" ? "light" : "dark");
                    setProfileOpen(false);
                  }}
                >
                  <span>☼</span>{" "}
                  {theme === "dark" ? "Alterar para Modo Claro" : "Alterar para Modo Escuro"}
                </button>
                <Link href="/minha-clinica" onClick={() => setProfileOpen(false)}>
                  <span>▤</span> Minha clínica
                </Link>
                <button type="button" onClick={sair}>
                  <span>↪</span> Sair
                </button>
              </div>
            ) : null}
          </div>

          <span className="topbar-version">v1.0</span>
        </div>

        {children}
      </main>
    </div>
  );
}
