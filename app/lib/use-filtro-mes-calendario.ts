"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectarViradaMesCalendario,
  mesAtualChave,
} from "./mes";
import {
  deveSeguirMesCalendario,
  mesInicialPreferido,
  persistirMesSelecionado,
} from "./preferencias";

/**
 * Filtro de mês alinhado ao calendário: inicia no mês atual e acompanha a virada.
 */
export function useFiltroMesCalendario() {
  const [mes, setMesState] = useState(mesInicialPreferido);
  const seguirMesCalendarioRef = useRef(deveSeguirMesCalendario());
  const mesCalendarioRef = useRef(mesInicialPreferido());

  useEffect(() => {
    if (!deveSeguirMesCalendario()) return;
    const { mudou, mesAtual } = detectarViradaMesCalendario();
    if (!mudou || !mesAtual) return;
    seguirMesCalendarioRef.current = true;
    mesCalendarioRef.current = mesAtual;
    setMesState(mesAtual);
  }, []);

  useEffect(() => {
    if (!seguirMesCalendarioRef.current) return;
    const atual = mesAtualChave();
    if (atual && mes !== atual) {
      setMesState(atual);
      mesCalendarioRef.current = atual;
    }
  }, [mes]);

  const setMes = useCallback((valor: string) => {
    const atual = mesAtualChave();
    seguirMesCalendarioRef.current = Boolean(valor && valor === atual);
    if (valor) {
      mesCalendarioRef.current = valor;
      persistirMesSelecionado(valor);
    }
    setMesState(valor);
  }, []);

  const selecionarMesAtual = useCallback(() => {
    const atual = mesAtualChave();
    if (!atual) return;
    seguirMesCalendarioRef.current = true;
    mesCalendarioRef.current = atual;
    setMesState(atual);
  }, []);

  return {
    mes,
    setMes,
    selecionarMesAtual,
    mesAtual: mesAtualChave(),
  };
}
