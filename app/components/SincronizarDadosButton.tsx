"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "../lib/auth";
import { carregarFrequenciasCompleto } from "../lib/db/frequencia";
import {
  deveExecutarManutencaoFrequencia,
  limparFlagManutencaoFrequencia,
  marcarManutencaoFrequenciaExecutada,
} from "../lib/manutencao-frequencia";
import { requireUserClient } from "../lib/require-user-client";

type Props = {
  className?: string;
  label?: string;
  labelExecutando?: string;
  onConcluido?: () => void;
};

export default function SincronizarDadosButton({
  className = "btn btn-outline",
  label = "Reparar e sincronizar dados",
  labelExecutando = "Sincronizando…",
  onConcluido,
}: Props) {
  const router = useRouter();
  const [executando, setExecutando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function sincronizar() {
    setExecutando(true);
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setExecutando(false);
      return;
    }

    limparFlagManutencaoFrequencia(user.id);

    const { error } = await carregarFrequenciasCompleto(user.id, {
      manutencao: true,
    });

    if (error) {
      setMensagem("Erro ao sincronizar: " + error.message);
      setExecutando(false);
      return;
    }

    marcarManutencaoFrequenciaExecutada(user.id);
    setMensagem("Dados sincronizados com sucesso.");
    setExecutando(false);
    onConcluido?.();
  }

  return (
    <div className="sync-dados-wrap">
      <button
        type="button"
        className={className}
        disabled={executando}
        onClick={() => void sincronizar()}
      >
        {executando ? labelExecutando : label}
      </button>
      {mensagem ? <p className="sync-dados-msg">{mensagem}</p> : null}
    </div>
  );
}
