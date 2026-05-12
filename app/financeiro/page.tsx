"use client";

import { useEffect, useState } from "react";
import supabase from "../lib/supabase";
import Janela from "../components/Janela";

export default function FinanceiroPage() {
  const [dados, setDados] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: pacientes } = await supabase
      .from("pacientes")
      .select("*");

    const { data: frequencias } = await supabase
      .from("frequência")
      .select("*")
      .eq("status", "presente");

    if (!pacientes || !frequencias) return;

    const resumo = pacientes.map((p: any) => {
      const presencas = frequencias.filter(
        (f: any) => f.paciente_id === p.id
      ).length;

      const valor = Number(p.valor_sessao || 0);

      return {
        nome: p.nome,
        presencas,
        valor,
        total: presencas * valor,
      };
    });

    setDados(resumo);
  }

  const totalGeral = dados.reduce(
    (acc, item) => acc + item.total,
    0
  );

  return (
    <div>
      <Janela titulo="Financeiro">
        <h1
          style={{
            fontSize: "28px",
            marginBottom: "24px",
            color: "#f8fafc",
          }}
        >
          Resumo Financeiro
        </h1>

        <div
          style={{
            marginBottom: "24px",
            color: "#3ecf8e",
            fontSize: "20px",
            fontWeight: "700",
          }}
        >
          Total Geral: R$ {totalGeral}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {dados.map((p: any) => (
            <div
              key={p.nome}
              className="psico-row"
            >
              <div>
                <strong
                  style={{
                    color: "#f8fafc",
                    fontSize: "16px",
                  }}
                >
                  {p.nome}
                </strong>

                <p
                  style={{
                    color: "#94a3b8",
                    marginTop: "6px",
                  }}
                >
                  {p.presencas} presença(s)
                </p>
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  R$ {p.valor} / sessão
                </div>

                <strong
                  style={{
                    color: "#3ecf8e",
                    fontSize: "18px",
                  }}
                >
                  R$ {p.total}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </Janela>
    </div>
  );
}