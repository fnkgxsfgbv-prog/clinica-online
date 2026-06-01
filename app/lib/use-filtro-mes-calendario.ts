"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectarViradaMesCalendario,
  mesAtualChave,
} from "./mes";

/**
 * Filtro de mês alinhado ao calendário: inicia no mês atual e acompanha a virada.
 */
export function useFiltroMesCalendario() {
  const [mes, setMesState] = useState(mesAtualChave);
  const seguirMesCalendarioRef = useRef(true);
  const mesCalendarioRef = useRef(mesAtualChave());

  useEffect(() => {
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
    if (valor) mesCalendarioRef.current = valor;
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
