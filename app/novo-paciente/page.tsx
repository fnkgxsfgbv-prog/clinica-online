"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import CidSearchSelect from "../components/CidSearchSelect";
import FlashMessage from "../components/FlashMessage";
import Janela from "../components/Janela";
import { getCurrentUser } from "../lib/auth";
import { createPaciente } from "../lib/db/pacientes";
import { salvarDataInicioNasObservacoes } from "../lib/paciente-metadata";
import { requireUserClient } from "../lib/require-user-client";
import { mensagemErroSupabase } from "../lib/supabase-error";

export default function NovoPaciente() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataInicioAtendimento, setDataInicioAtendimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cid, setCid] = useState("");
  const [valorSessao, setValorSessao] = useState("");

  const [flash, setFlash] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  function mostrarFlash(
    texto: string,
    kind: "success" | "error"
  ) {
    setFlash({ kind, text: texto });

    window.setTimeout(() => {
      setFlash(null);
    }, 4000);
  }

  async function salvarPaciente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await createPaciente(user.id, {
      nome,
      data_nascimento: dataNascimento,
      telefone,
      cid,
      observacoes: salvarDataInicioNasObservacoes("", dataInicioAtendimento),
      valor_sessao: valorSessao,
    });

    if (error) {
      mostrarFlash(
        mensagemErroSupabase("salvar paciente", error),
        "error"
      );
      return;
    }

    mostrarFlash("Paciente cadastrado com sucesso!", "success");

    setNome("");
    setDataNascimento("");
    setDataInicioAtendimento("");
    setTelefone("");
    setCid("");
    setValorSessao("");
  }

  return (
    <div>
      <Janela titulo="Novo Paciente">
        <form
          onSubmit={(e) => void salvarPaciente(e)}
          style={{
            display: "grid",
            gap: "18px",
            marginTop: "24px",
          }}
        >
          {flash ? (
            <FlashMessage kind={flash.kind}>{flash.text}</FlashMessage>
          ) : null}

          <label className="login-field-label" htmlFor="novo-paciente-nome">
            Nome completo
          </label>
          <input
            id="novo-paciente-nome"
            className="psico-input"
            placeholder="Nome do paciente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoComplete="name"
          />

          <label className="login-field-label" htmlFor="novo-paciente-nasc">
            Data de nascimento
          </label>
          <input
            id="novo-paciente-nasc"
            className="psico-input"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
          />

          <label className="login-field-label" htmlFor="novo-paciente-inicio">
            Data de início do atendimento
          </label>
          <input
            id="novo-paciente-inicio"
            className="psico-input"
            type="date"
            value={dataInicioAtendimento}
            onChange={(e) => setDataInicioAtendimento(e.target.value)}
          />

          <label className="login-field-label" htmlFor="novo-paciente-tel">
            Telefone
          </label>
          <input
            id="novo-paciente-tel"
            className="psico-input"
            type="tel"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            autoComplete="tel"
          />

          <CidSearchSelect
            id="novo-paciente-cid"
            value={cid}
            onChange={setCid}
            label="CIDs do paciente"
          />

          <label className="login-field-label" htmlFor="novo-paciente-valor">
            Valor da sessão (R$)
          </label>
          <input
            id="novo-paciente-valor"
            className="psico-input"
            inputMode="decimal"
            placeholder="Ex.: 120"
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
        </form>
      </Janela>
    </div>
  );
}
