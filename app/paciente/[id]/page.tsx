"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getPacienteById } from "../../lib/db/pacientes";
import { listEvolucoesPorPacientePorId } from "../../lib/db/evolucoes";
import { listSessoesPorPaciente } from "../../lib/db/sessoes";
import Janela from "../../components/Janela";
import type { Evolucao, Paciente, Sessao } from "../../types";

export default function PacientePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [aba, setAba] = useState("sessoes");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: pacienteData, error: pacienteError } = await getPacienteById(
      user.id,
      id
    );

    if (pacienteError) {
      alert("Erro ao carregar paciente: " + pacienteError.message);
      return;
    }

    const { data: sessoesData, error: sessoesError } =
      await listSessoesPorPaciente(user.id, id);

    if (sessoesError) {
      alert("Erro ao carregar sessões: " + sessoesError.message);
      return;
    }

    const { data: evolucoesData, error: evolucoesError } =
      await listEvolucoesPorPacientePorId(user.id, id);

    if (evolucoesError) {
      alert("Erro ao carregar evoluções: " + evolucoesError.message);
      return;
    }

    setPaciente(pacienteData as Paciente);
    setSessoes((sessoesData || []) as Sessao[]);
    setEvolucoes((evolucoesData || []) as Evolucao[]);
  }

  if (!paciente) {
    return <p style={{ color: "#94a3b8" }}>Carregando paciente...</p>;
  }

  return (
    <div className="patient-record-page">
      <Janela titulo="Prontuário do Paciente">
        <h1 className="patient-record-title">
          {paciente.nome}
        </h1>

        <p className="patient-muted">
          Telefone: {paciente.telefone || "Não informado"}
        </p>
        <p className="patient-muted">
          CID: {paciente.cid || "Não informado"}
        </p>
        <p className="patient-muted">
          Valor da sessão:{" "}
          {paciente.valor_sessao
            ? `R$ ${paciente.valor_sessao}`
            : "Não informado"}
        </p>
      </Janela>

      <Janela titulo="Central do Paciente">
        <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
          <button
            className={aba === "sessoes" ? "btn btn-green" : "btn btn-outline"}
            onClick={() => setAba("sessoes")}
          >
            Sessões
          </button>

          <button
            className={
              aba === "evolucoes" ? "btn btn-green" : "btn btn-outline"
            }
            onClick={() => setAba("evolucoes")}
          >
            Evoluções
          </button>

          <button
            className="btn btn-green"
            onClick={() => router.push(`/paciente/${id}/nova-evolucao`)}
          >
            + Registrar evolução
          </button>
        </div>

        {aba === "sessoes" && (
          <div className="session-list">
            {sessoes.length === 0 ? (
              <p className="empty-text">Nenhuma sessão registrada.</p>
            ) : (
              sessoes.map((s) => (
                <div key={s.id} className="lista-card">
                  <div>
                    <strong>{s.data} às {s.hora}</strong>
                    <p>Status: {s.status || "Agendada"}</p>
                  </div>

                  <button
                    className="btn btn-outline"
                    onClick={() => router.push(`/sessao/${s.id}`)}
                  >
                    Abrir sessão
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {aba === "evolucoes" && (
          <div className="session-list">
            {evolucoes.length === 0 ? (
              <p className="empty-text">Nenhuma evolução registrada.</p>
            ) : (
              evolucoes.map((e) => (
                <div key={e.id} className="psico-card patient-evolution-card">
                  <p className="patient-evolution-date">{e.data || "Sem data"}</p>

                  <Campo titulo="Queixa" valor={e.queixa} />
                  <Campo titulo="Objetivo" valor={e.objetivo} />
                  <Campo titulo="Intervenção" valor={e.intervencao} />
                  <Campo titulo="Observações" valor={e.observacoes} />
                  <Campo titulo="Plano" valor={e.plano} />
                  <Campo titulo="Encaminhamentos" valor={e.encaminhamentos} />
                </div>
              ))
            )}
          </div>
        )}
      </Janela>
    </div>
  );
}

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor?: string | null;
}) {
  if (!valor) return null;

  return (
    <div className="patient-field">
      <strong className="patient-field-title">{titulo}</strong>
      <p className="patient-field-text">
        {valor}
      </p>
    </div>
  );
}
