"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import supabase from "../../lib/supabase";
import Janela from "../../components/Janela";

export default function PacientePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [paciente, setPaciente] = useState<any>(null);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [aba, setAba] = useState("sessoes");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: pacienteData, error: pacienteError } = await supabase
      .from("pacientes")
      .select("*")
      .eq("id", id)
      .single();

    if (pacienteError) {
      alert("Erro ao carregar paciente: " + pacienteError.message);
      return;
    }

    const { data: sessoesData, error: sessoesError } = await supabase
      .from("sessoes")
      .select("*")
      .eq("paciente_id", id)
      .order("id", { ascending: false });

    if (sessoesError) {
      alert("Erro ao carregar sessões: " + sessoesError.message);
      return;
    }

    const { data: evolucoesData, error: evolucoesError } = await supabase
      .from("evolucoes")
      .select("*")
      .eq("paciente_id", id)
      .order("id", { ascending: false });

    if (evolucoesError) {
      alert("Erro ao carregar evoluções: " + evolucoesError.message);
      return;
    }

    setPaciente(pacienteData);
    setSessoes(sessoesData || []);
    setEvolucoes(evolucoesData || []);
  }

  if (!paciente) {
    return <p style={{ color: "#94a3b8" }}>Carregando paciente...</p>;
  }

  return (
    <div>
      <Janela titulo="Prontuário do Paciente">
        <h1 style={{ color: "#f8fafc", fontSize: "28px" }}>
          {paciente.nome}
        </h1>

        <p style={texto}>Telefone: {paciente.telefone || "Não informado"}</p>
        <p style={texto}>CID: {paciente.cid || "Não informado"}</p>
        <p style={texto}>
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
                <div key={e.id} className="psico-card">
                  <p style={texto}>{e.data || "Sem data"}</p>

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

function Campo({ titulo, valor }: { titulo: string; valor?: string }) {
  if (!valor) return null;

  return (
    <div style={{ marginTop: "12px" }}>
      <strong style={{ color: "#3ecf8e" }}>{titulo}</strong>
      <p style={{ color: "#e2e8f0", marginTop: "4px", lineHeight: "1.7" }}>
        {valor}
      </p>
    </div>
  );
}

const texto = {
  color: "#94a3b8",
  marginTop: "6px",
};