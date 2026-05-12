"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "./lib/supabase";
import Janela from "./components/Janela";

export default function Home() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [frequencias, setFrequencias] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: userData } = await supabase.auth.getUser();

    const user = userData.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: pacientesData } = await supabase
      .from("pacientes")
      .select("*")
      .eq("user_id", user.id);

  const agora = new Date();
const hoje = agora.toISOString().split("T")[0];
const horaAtual = agora.toTimeString().slice(0, 5);

const { data: sessoesData } = await supabase
  .from("sessoes")
  .select("*")
  .eq("user_id", user.id)
  .eq("status", "Agendada")
  .or(`data.gt.${hoje},and(data.eq.${hoje},hora.gte.${horaAtual})`)
  .order("data", { ascending: true })
  .order("hora", { ascending: true })
  .limit(5);

    const { data: frequenciasData } = await supabase
      .from("frequência")
      .select("*")
      .eq("user_id", user.id);

    setPacientes(pacientesData || []);
    setSessoes(sessoesData || []);
    setFrequencias(frequenciasData || []);
  }

  const hoje = new Date().toISOString().split("T")[0];

  const pacientesAtivos = pacientes.filter(
    (p) => !p.status || p.status === "ativo"
  ).length;

  const sessoesHoje = sessoes.filter(
    (s) => s.data === hoje
  );

  const presencas = frequencias.filter(
    (f) => f.status === "Presente"
  ).length;

  const faltas = frequencias.filter(
    (f) => f.status === "Faltou"
  ).length;

  const receitaPrevista = sessoes.reduce(
    (total, sessao) => {
      return total + Number(sessao.valor || 0);
    },
    0
  );

  return (
    <div>
      <Janela titulo="Dashboard">
        <p className="dashboard-subtitle">
          Visão geral da clínica
        </p>

        <div className="dashboard-grid compact">
          <div className="dashboard-card">
            <p className="dashboard-label">
              Pacientes ativos
            </p>

            <h2 className="dashboard-value">
              {pacientesAtivos}
            </h2>
          </div>

          <div className="dashboard-card">
            <p className="dashboard-label">
              Sessões hoje
            </p>

            <h2 className="dashboard-value">
              {sessoesHoje.length}
            </h2>
          </div>

          <div className="dashboard-card">
            <p className="dashboard-label">
              Presenças
            </p>

            <h2 className="dashboard-value">
              {presencas}
            </h2>
          </div>

          <div className="dashboard-card">
            <p className="dashboard-label">
              Faltas
            </p>

            <h2 className="dashboard-value">
              {faltas}
            </h2>
          </div>

          <div className="dashboard-card">
            <p className="dashboard-label">
              Receita prevista
            </p>

            <h2 className="dashboard-value">
              R$ {receitaPrevista.toFixed(2)}
            </h2>
          </div>
        </div>
      </Janela>

      <Janela titulo="Próximas Sessões">
        {sessoes.length === 0 ? (
          <p className="empty-text">
            Nenhuma sessão agendada.
          </p>
        ) : (
          <div className="session-list">
            {sessoes.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="lista-card"
              >
                <div>
                  <strong>
                    {s.paciente_nome || "Paciente"}
                  </strong>

                  <p>
                    {s.data} às {s.hora}
                  </p>
                </div>

                <button
                  className="btn btn-outline"
                  onClick={() =>
                    router.push(`/sessao/${s.id}`)
                  }
                >
                  Abrir sessão
                </button>
              </div>
            ))}
          </div>
        )}
      </Janela>
    </div>
  );
}