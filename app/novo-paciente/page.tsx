"use client";

import { useState } from "react";
import { getCurrentUser } from "../lib/auth";
import { createPaciente } from "../lib/db/pacientes";
import Janela from "../components/Janela";

export default function NovoPaciente() {
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valorSessao, setValorSessao] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<
    "sucesso" | "erro" | ""
  >("");

  function mostrarMensagem(
    texto: string,
    tipo: "sucesso" | "erro"
  ) {
    setMensagem(texto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
      setTipoMensagem("");
    }, 3000);
  }

  async function salvarPaciente(e: React.FormEvent) {
    e.preventDefault();

    const user = await getCurrentUser();

    if (!user) {
      mostrarMensagem("Usuário não logado.", "erro");
      return;
    }

    const { error } = await createPaciente(user.id, {
      nome,
      data_nascimento: dataNascimento,
      telefone,
      valor_sessao: valorSessao,
    });

    if (error) {
      mostrarMensagem(
        "Erro ao salvar paciente: " + error.message,
        "erro"
      );
      return;
    }

    mostrarMensagem(
      "Paciente cadastrado com sucesso!",
      "sucesso"
    );

    setNome("");
    setDataNascimento("");
    setTelefone("");
    setValorSessao("");
  }

  return (
    <div>
      <Janela titulo="Novo Paciente">
        <form
          onSubmit={salvarPaciente}
          style={{
            display: "grid",
            gap: "18px",
            marginTop: "24px",
          }}
        >
          <input
            placeholder="Nome do paciente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
          />

          <input
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />

          <input
            placeholder="Valor da sessão. Ex: 120"
            value={valorSessao}
            onChange={(e) => setValorSessao(e.target.value)}
          />

          <button
            type="submit"
            className="btn btn-green"
            style={{
              height: "52px",
              borderRadius: "16px",
              fontSize: "15px",
            }}
          >
            Salvar paciente
          </button>

          {mensagem && (
            <div
              style={{
                background:
                  tipoMensagem === "sucesso"
                    ? "rgba(62,207,142,0.12)"
                    : "rgba(248,113,113,0.12)",

                border:
                  tipoMensagem === "sucesso"
                    ? "1px solid rgba(62,207,142,0.35)"
                    : "1px solid rgba(248,113,113,0.35)",

                color:
                  tipoMensagem === "sucesso"
                    ? "#86efac"
                    : "#fecaca",

                padding: "14px",
                borderRadius: "14px",
                fontWeight: 700,
              }}
            >
              {mensagem}
            </div>
          )}
        </form>
      </Janela>
    </div>
  );
}