"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import supabase from "../../../lib/supabase";
import Janela from "../../../components/Janela";

export default function NovaEvolucao() {
  const params = useParams();
  const router = useRouter();

  const paciente_id = params.id;

  const [queixa, setQueixa] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [intervencao, setIntervencao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [plano, setPlano] = useState("");
  const [encaminhamentos, setEncaminhamentos] = useState("");

  const [humor, setHumor] = useState("");
  const [statusSessao, setStatusSessao] =
    useState("Realizada");

  const [evolucoes, setEvolucoes] = useState<any[]>([]);

  useEffect(() => {
    carregarEvolucoes();
  }, []);

  async function carregarEvolucoes() {
    const { data, error } = await supabase
      .from("evolucoes")
      .select("*")
      .eq("paciente_id", Number(paciente_id))
      .order("data", { ascending: false });

    if (error) {
      alert(
        "Erro ao carregar evoluções: " +
          error.message
      );
      return;
    }

    setEvolucoes(data || []);
  }

  async function salvarEvolucao() {
    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      alert(
        "Erro ao buscar usuário: " +
          userError.message
      );
      return;
    }

    const user = userData.user;

    if (!user) {
      alert(
        "Usuário não encontrado. Faça login novamente."
      );
      return;
    }

    const { error } = await supabase
      .from("evolucoes")
      .insert([
        {
          user_id: user.id,
          paciente_id: Number(paciente_id),

          data: new Date()
            .toISOString()
            .split("T")[0],

          humor,
          status_sessao: statusSessao,

          queixa,
          objetivo,
          intervencao,
          observacoes,
          plano,
          encaminhamentos,
        },
      ]);

    if (error) {
      alert(
        "Erro ao salvar evolução: " +
          error.message
      );
      return;
    }

    alert("Evolução salva com sucesso!");

    setQueixa("");
    setObjetivo("");
    setIntervencao("");
    setObservacoes("");
    setPlano("");
    setEncaminhamentos("");
    setHumor("");
    setStatusSessao("Realizada");

    carregarEvolucoes();
  }

  function Campo({
    titulo,
    valor,
  }: {
    titulo: string;
    valor: string;
  }) {
    if (!valor) return null;

    return (
      <div style={{ marginBottom: "18px" }}>
        <p
          style={{
            color: "#4ade80",
            fontWeight: 700,
            marginBottom: "6px",
          }}
        >
          {titulo}
        </p>

        <p
          style={{
            color: "#f8fafc",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {valor}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Janela titulo="Nova Evolução">
        <p
          style={{
            color: "#94a3b8",
            marginBottom: "18px",
            fontSize: "14px",
          }}
        >
          Evolução registrada automaticamente em{" "}
          {new Date().toLocaleDateString(
            "pt-BR"
          )}
        </p>

        <div className="form-grid">
          <div>
            <label className="label-form">
              Humor do paciente
            </label>

            <select
              value={humor}
              onChange={(e) =>
                setHumor(e.target.value)
              }
              className="input"
            >
              <option value="">
                Selecionar
              </option>

              <option>
                Calmo
              </option>

              <option>
                Ansioso
              </option>

              <option>
                Triste
              </option>

              <option>
                Irritado
              </option>

              <option>
                Agitado
              </option>

              <option>
                Feliz
              </option>
            </select>
          </div>

          <div>
            <label className="label-form">
              Status da sessão
            </label>

            <select
              value={statusSessao}
              onChange={(e) =>
                setStatusSessao(
                  e.target.value
                )
              }
              className="input"
            >
              <option>
                Realizada
              </option>

              <option>
                Cancelada
              </option>

              <option>
                Remarcada
              </option>
            </select>
          </div>

          <textarea
            placeholder="Queixa"
            value={queixa}
            onChange={(e) =>
              setQueixa(e.target.value)
            }
          />

          <textarea
            placeholder="Objetivo da sessão"
            value={objetivo}
            onChange={(e) =>
              setObjetivo(e.target.value)
            }
          />

          <textarea
            placeholder="Intervenção realizada"
            value={intervencao}
            onChange={(e) =>
              setIntervencao(
                e.target.value
              )
            }
          />

          <textarea
            placeholder="Observações"
            value={observacoes}
            onChange={(e) =>
              setObservacoes(
                e.target.value
              )
            }
          />

          <textarea
            placeholder="Plano terapêutico"
            value={plano}
            onChange={(e) =>
              setPlano(e.target.value)
            }
          />

          <textarea
            placeholder="Encaminhamentos"
            value={encaminhamentos}
            onChange={(e) =>
              setEncaminhamentos(
                e.target.value
              )
            }
          />

          <button
            className="btn btn-green"
            onClick={salvarEvolucao}
          >
            Salvar evolução
          </button>
        </div>
      </Janela>

      <Janela titulo="Evoluções anteriores">
        {evolucoes.length === 0 ? (
          <p className="empty-text">
            Nenhuma evolução registrada.
          </p>
        ) : (
          <div className="session-list">
            {evolucoes.map((e) => (
              <div
                key={e.id}
                className="psico-card"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: "18px",
                  }}
                >
                  <strong>
                    {e.data || "Sem data"}
                  </strong>

                  <span
                    style={{
                      color: "#4ade80",
                      fontWeight: 700,
                    }}
                  >
                    {e.status_sessao ||
                      "Realizada"}
                  </span>
                </div>

                <Campo
                  titulo="Humor"
                  valor={e.humor}
                />

                <Campo
                  titulo="Queixa"
                  valor={e.queixa}
                />

                <Campo
                  titulo="Objetivo"
                  valor={e.objetivo}
                />

                <Campo
                  titulo="Intervenção"
                  valor={e.intervencao}
                />

                <Campo
                  titulo="Observações"
                  valor={e.observacoes}
                />

                <Campo
                  titulo="Plano terapêutico"
                  valor={e.plano}
                />

                <Campo
                  titulo="Encaminhamentos"
                  valor={
                    e.encaminhamentos
                  }
                />
              </div>
            ))}
          </div>
        )}
      </Janela>
    </div>
  );
}