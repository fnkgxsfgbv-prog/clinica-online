"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DashboardBlocoId } from "./dashboard-blocos";
import {
  gravarLayoutDashboardLocal,
  lerLayoutDashboardLocal,
  type DashboardLayoutPreferencias,
  type PreferenciasUsuario,
} from "./preferencias";

type AtualizarPreferencias = (
  parcial:
    | Partial<PreferenciasUsuario>
    | ((atual: PreferenciasUsuario) => Partial<PreferenciasUsuario>),
  opcoes?: { salvarNuvem?: boolean; imediato?: boolean }
) => Promise<{ error?: string }>;

function layoutInicial(
  preferencias: PreferenciasUsuario
): DashboardLayoutPreferencias {
  return (
    lerLayoutDashboardLocal() ?? {
      dashboardBlocosOcultos: preferencias.dashboardBlocosOcultos,
      dashboardBlocosOrdem: preferencias.dashboardBlocosOrdem,
    }
  );
}

/** Estado local do layout do dashboard — não depende de recargas do JWT. */
export function useDashboardLayout(
  preferencias: PreferenciasUsuario,
  atualizarPreferencias: AtualizarPreferencias
) {
  const editadoLocalmente = useRef(false);
  const [layout, setLayout] = useState<DashboardLayoutPreferencias>(() =>
    layoutInicial(preferencias)
  );

  useEffect(() => {
    if (editadoLocalmente.current) return;

    const salvo = lerLayoutDashboardLocal();
    if (salvo) {
      setLayout(salvo);
      return;
    }

    setLayout({
      dashboardBlocosOcultos: preferencias.dashboardBlocosOcultos,
      dashboardBlocosOrdem: preferencias.dashboardBlocosOrdem,
    });
  }, [
    preferencias.dashboardBlocosOcultos,
    preferencias.dashboardBlocosOrdem,
  ]);

  const salvarLayout = useCallback(
    (
      parcial:
        | Partial<DashboardLayoutPreferencias>
        | ((
            atual: DashboardLayoutPreferencias
          ) => Partial<DashboardLayoutPreferencias>)
    ) => {
      editadoLocalmente.current = true;

      setLayout((atual) => {
        const patch =
          typeof parcial === "function" ? parcial(atual) : parcial;
        const proximo = { ...atual, ...patch };
        gravarLayoutDashboardLocal(proximo);
        void atualizarPreferencias(
          {
            dashboardBlocosOcultos: proximo.dashboardBlocosOcultos,
            dashboardBlocosOrdem: proximo.dashboardBlocosOrdem,
          },
          { salvarNuvem: true, imediato: true }
        );
        return proximo;
      });
    },
    [atualizarPreferencias]
  );

  return {
    blocosOcultos: layout.dashboardBlocosOcultos,
    blocosOrdem: layout.dashboardBlocosOrdem,
    salvarLayout,
  };
}

export type { DashboardBlocoId };
