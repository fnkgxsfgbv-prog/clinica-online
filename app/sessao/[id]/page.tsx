"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import jsPDF from "jspdf";

import supabase from "../../lib/supabase";
import Janela from "../../components/Janela";

export default function SessaoPage() {
  const params = useParams();
  const id = params.id;

  const [sessao, setSessao] = useState<any>(null);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);

  const [queixa, setQueixa] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [intervencao, setIntervencao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [plano, setPlano] = useState("");
  const [encaminhamentos, setEncaminhamentos] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarSessao();
  }, []);

  useEffect(() => {
    if (sessao?.paciente_id) {
      carregarEvolucoes();
    }
  }, [sessao]);

  function mostrarMensagem(texto: string) {
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 3000);
  }

  async function carregarSessao() {
    const { data, error } = await supabase
      .from("sessoes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      mostrarMensagem("Erro ao carregar sessão: " + error.message);
      return;
    }

    setSessao(data);
  }

  async function carregarEvolucoes() {
    if (!sessao?.paciente_id) return;

    const { data, error } = await supabase
      .from("evolucoes")
      .select("*")
      .eq("paciente_id", Number(sessao.paciente_id))
      .order("id", { ascending: false });

    if (error) {
      mostrarMensagem("Erro ao carregar evoluções: " + error.message);
      return;
    }

    setEvolucoes(data || []);
  }

  function formatarDataBR(data: string) {
    if (!data) return "";

    if (data.includes("/")) return data;

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  async function atualizarStatus(novoStatus: string) {
    if (!sessao) return;

    const { error } = await supabase
      .from("sessoes")
      .update({ status: novoStatus })
      .eq("id", id);

    if (error) {
      mostrarMensagem("Erro ao atualizar status: " + error.message);
      return;
    }

    if (novoStatus === "Presente" || novoStatus === "Faltou") {
      const { error: freqError } = await supabase.from("frequência").insert([
        {
          user_id: sessao.user_id,
          paciente_id: Number(sessao.paciente_id),
          paciente_nome: sessao.paciente_nome,
          data: formatarDataBR(sessao.data),
          status: novoStatus,
        },
      ]);

      if (freqError) {
        mostrarMensagem("Status salvo, mas erro na frequência: " + freqError.message);
        return;
      }
    }

    mostrarMensagem(`Sessão marcada como ${novoStatus}.`);
    carregarSessao();
  }

  function gerarReciboPDF() {
    if (!sessao) return;

    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text("RECIBO DE SESSÃO", 20, 25);

    doc.setFontSize(13);
    doc.text(`Paciente: ${sessao.paciente_nome || "-"}`, 20, 50);
    doc.text(`Data: ${sessao.data || "-"}`, 20, 62);
    doc.text(`Horário: ${sessao.hora || "-"}`, 20, 74);
    doc.text(`Valor: R$ ${Number(sessao.valor || 0).toFixed(2)}`, 20, 86);
    doc.text(`Forma de pagamento: ${sessao.forma_pagamento || "-"}`, 20, 98);
    doc.text(`Status do pagamento: ${sessao.status_pagamento || "-"}`, 20, 110);

    doc.text(
      "Declaro ter recebido o valor referente à sessão psicológica.",
      20,
      140
    );

    doc.text("__________________________________", 20, 190);
    doc.text("Assinatura", 20, 200);

    doc.save(`recibo-${sessao.paciente_nome || "sessao"}.pdf`);
  }

  async function salvarEvolucao() {
    if (!sessao) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      mostrarMensagem("Erro ao buscar usuário: " + userError.message);
      return;
    }

    const user = userData.user;

    const { error } = await supabase.from("evolucoes").insert([
      {
        user_id: user?.id,
        sessao_id: Number(sessao.id),
        paciente_id: Number(sessao.paciente_id),

        data: new Date().toISOString().split("T")[0],

        queixa,
        objetivo,
        intervencao,
        observacoes,
        plano,
        encaminhamentos,
      },
    ]);

    if (error) {
      mostrarMensagem("Erro ao salvar evolução: " + error.message);
      return;
    }

    setQueixa("");
    setObjetivo("");
    setIntervencao("");
    setObservacoes("");
    setPlano("");
    setEncaminhamentos("");

    mostrarMensagem("Evolução salva com sucesso.");
    carregarEvolucoes();
  }

  if (!sessao) {
    return <p style={{ color: "#fff" }}>Carregando...</p>;
  }

  return (
    <div>
      <Janela titulo="Sessão Clínica">
        <h1 style={{ fontSize: "28px", color: "#fff", marginBottom: "10px" }}>
          {sessao.paciente_nome}
        </h1>

        <p style={{ color: "#94a3b8" }}>
          {sessao.data} às {sessao.hora}
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "24px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-green"
            onClick={() => atualizarStatus("Presente")}
          >
            Presente
          </button>

          <button
            className="btn btn-outline"
            onClick={() => atualizarStatus("Faltou")}
            style={{ borderColor: "#ef4444", color: "#fecaca" }}
          >
            Faltou
          </button>

          <button
            className="btn btn-outline"
            onClick={() => atualizarStatus("Cancelada")}
          >
            Cancelar
          </button>

          <button className="btn btn-outline" onClick={gerarReciboPDF}>
            Gerar recibo
          </button>
        </div>

        {mensagem && (
          <div
            style={{
              marginTop: "18px",
              background: "rgba(62,207,142,0.12)",
              border: "1px solid rgba(62,207,142,0.4)",
              padding: "14px",
              borderRadius: "14px",
              color: "#86efac",
              fontWeight: 600,
            }}
          >
            {mensagem}
          </div>
        )}
      </Janela>

      <Janela titulo="Evolução da Sessão">
        <div style={{ display: "grid", gap: "18px" }}>
          <CardEvolucao
            titulo="Queixa"
            value={queixa}
            onChange={setQueixa}
            placeholder="Descreva a demanda principal..."
          />

          <CardEvolucao
            titulo="Objetivo da Sessão"
            value={objetivo}
            onChange={setObjetivo}
            placeholder="Objetivos terapêuticos trabalhados..."
          />

          <CardEvolucao
            titulo="Intervenção"
            value={intervencao}
            onChange={setIntervencao}
            placeholder="Técnicas utilizadas..."
          />

          <CardEvolucao
            titulo="Observações Clínicas"
            value={observacoes}
            onChange={setObservacoes}
            placeholder="Comportamentos observados..."
          />

          <CardEvolucao
            titulo="Plano Terapêutico"
            value={plano}
            onChange={setPlano}
            placeholder="Plano para próxima sessão..."
          />

          <CardEvolucao
            titulo="Encaminhamentos"
            value={encaminhamentos}
            onChange={setEncaminhamentos}
            placeholder="Orientações e encaminhamentos..."
          />

          <button
            className="btn btn-green"
            onClick={salvarEvolucao}
            style={{
              width: "100%",
              height: "54px",
              fontSize: "15px",
              borderRadius: "16px",
            }}
          >
            Salvar evolução
          </button>
        </div>
      </Janela>

      <Janela titulo="Histórico do Paciente">
        {evolucoes.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>Nenhuma evolução registrada.</p>
        ) : (
          <div style={{ display: "grid", gap: "18px" }}>
            {evolucoes.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "18px",
                  padding: "20px",
                }}
              >
                <p
                  style={{
                    color: "#94a3b8",
                    marginBottom: "14px",
                    fontSize: "14px",
                  }}
                >
                  {item.data}
                </p>

                <Campo titulo="Queixa" valor={item.queixa} />
                <Campo titulo="Objetivo" valor={item.objetivo} />
                <Campo titulo="Intervenção" valor={item.intervencao} />
                <Campo titulo="Observações" valor={item.observacoes} />
                <Campo titulo="Plano" valor={item.plano} />
                <Campo titulo="Encaminhamentos" valor={item.encaminhamentos} />
              </div>
            ))}
          </div>
        )}
      </Janela>
    </div>
  );
}

function CardEvolucao({
  titulo,
  value,
  onChange,
  placeholder,
}: {
  titulo: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "18px",
        padding: "20px",
      }}
    >
      <h3
        style={{
          color: "#fff",
          marginBottom: "14px",
          fontSize: "17px",
          fontWeight: 700,
        }}
      >
        {titulo}
      </h3>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          minHeight: "120px",
          background: "#020617",
          border: "1px solid #334155",
          borderRadius: "14px",
          padding: "14px",
          color: "#fff",
          fontSize: "14px",
          resize: "vertical",
        }}
      />
    </div>
  );
}

function Campo({ titulo, valor }: { titulo: string; valor?: string }) {
  if (!valor) return null;

  return (
    <div style={{ marginBottom: "14px" }}>
      <strong
        style={{
          color: "#3ecf8e",
          display: "block",
          marginBottom: "6px",
        }}
      >
        {titulo}
      </strong>

      <p style={{ color: "#e2e8f0", lineHeight: "1.7" }}>{valor}</p>
    </div>
  );
}