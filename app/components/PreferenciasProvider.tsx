"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  agendarSalvarPreferenciasNuvem,
  aplicarTemaNoDocumento,
  carregarPreferenciasUsuario,
  gravarLayoutDashboardLocal,
  gravarPreferenciasLocal,
  inscreverMudancaTemaSistema,
  mesclarPreferencias,
  preferenciasPadrao,
  salvarPreferenciasUsuario,
  type PreferenciasUsuario,
} from "../lib/preferencias";
import supabase from "../lib/supabase";

type PreferenciasContextValue = {
  preferencias: PreferenciasUsuario;
  carregando: boolean;
  salvando: boolean;
  atualizarPreferencias: (
    parcial:
      | Partial<PreferenciasUsuario>
      | ((atual: PreferenciasUsuario) => Partial<PreferenciasUsuario>),
    opcoes?: { salvarNuvem?: boolean; imediato?: boolean }
  ) => Promise<{ error?: string }>;
  recarregarPreferencias: () => Promise<void>;
};

const PreferenciasContext = createContext<PreferenciasContextValue | null>(null);

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<PreferenciasUsuario>(
    preferenciasPadrao
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const ignorarRecargaAuth = useRef(false);

  const aplicarUsuario = useCallback(async (user: User | null) => {
    if (ignorarRecargaAuth.current) return;

    if (!user) {
      setPreferencias(preferenciasPadrao());
      setCarregando(false);
      return;
    }

    setCarregando(true);
    const prefs = await carregarPreferenciasUsuario(user);
    if (!ignorarRecargaAuth.current) {
      setPreferencias(prefs);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      await aplicarUsuario(data.user);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Salvar prefs dispara eventos com JWT/metadata ainda desatualizados.
      if (
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED" ||
        ignorarRecargaAuth.current
      ) {
        return;
      }

      void aplicarUsuario(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [aplicarUsuario]);

  useEffect(() => {
    aplicarTemaNoDocumento(preferencias.tema);
    if (preferencias.tema !== "system") return;

    return inscreverMudancaTemaSistema(() => {
      aplicarTemaNoDocumento("system");
    });
  }, [preferencias.tema]);

  const atualizarPreferencias = useCallback<
    PreferenciasContextValue["atualizarPreferencias"]
  >(async (parcial, opcoes) => {
    let mescladas = preferenciasPadrao();

    setPreferencias((atual) => {
      const patch =
        typeof parcial === "function" ? parcial(atual) : parcial;
      mescladas = mesclarPreferencias({ ...atual, ...patch });
      gravarPreferenciasLocal(mescladas);
      if (
        patch.dashboardBlocosOcultos != null ||
        patch.dashboardBlocosOrdem != null
      ) {
        gravarLayoutDashboardLocal({
          dashboardBlocosOcultos: mescladas.dashboardBlocosOcultos,
          dashboardBlocosOrdem: mescladas.dashboardBlocosOrdem,
        });
      }
      aplicarTemaNoDocumento(mescladas.tema);
      return mescladas;
    });

    if (opcoes?.imediato) {
      ignorarRecargaAuth.current = true;
      setSalvando(true);
      const result = await salvarPreferenciasUsuario(mescladas);
      setSalvando(false);
      window.setTimeout(() => {
        ignorarRecargaAuth.current = false;
      }, 1500);
      return result;
    }

    if (opcoes?.salvarNuvem !== false) {
      agendarSalvarPreferenciasNuvem(mescladas);
    }

    return {};
  }, []);

  const recarregarPreferencias = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await aplicarUsuario(data.user);
  }, [aplicarUsuario]);

  const value = useMemo<PreferenciasContextValue>(
    () => ({
      preferencias,
      carregando,
      salvando,
      atualizarPreferencias,
      recarregarPreferencias,
    }),
    [
      preferencias,
      carregando,
      salvando,
      atualizarPreferencias,
      recarregarPreferencias,
    ]
  );

  return (
    <PreferenciasContext.Provider value={value}>
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  const ctx = useContext(PreferenciasContext);
  if (!ctx) {
    throw new Error(
      "usePreferencias deve ser usado dentro de PreferenciasProvider"
    );
  }
  return ctx;
}

export function usePreferenciasOpcional() {
  return useContext(PreferenciasContext);
}
