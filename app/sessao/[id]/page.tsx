"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import jsPDF from "jspdf";

import { getCurrentUser } from "../../lib/auth";
import {
  deleteFrequenciaPorSessao,
  insertFrequencia,
} from "../../lib/db/frequencia";
import {
  getSessaoById,
  updateSessao,
} from "../../lib/db/sessoes";
import {
  insertEvolucao,
  listEvolucoesPorPacientePorId,
} from "../../lib/db/evolucoes";
import Janela from "../../components/Janela";
import type { Evolucao, Sessao } from "../../types";

export default function SessaoPage() {
  const params = useParams();
  const id = params.id;

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);

  const [queixa, setQueixa] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [intervencao, setIntervencao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [plano, setPlano] = useState("");
  const [encaminhamentos, setEncaminhamentos] = useState("");
  const [mensagem, setMensagem] = useState("");
const [abrirReagendar, setAbrirReagendar] = useState(false);
const [novaData, setNovaData] = useState("");
const [novaHora, setNovaHora] = useState("");
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
    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await getSessaoById(user.id, id as string);

    if (error) {
      mostrarMensagem("Erro ao carregar sessão: " + error.message);
      return;
    }

    setSessao(data as Sessao);
  }

  async function carregarEvolucoes() {
    if (!sessao?.paciente_id) return;

    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await listEvolucoesPorPacientePorId(
      user.id,
      Number(sessao.paciente_id)
    );

    if (error) {
      mostrarMensagem("Erro ao carregar evoluções: " + error.message);
      return;
    }

    setEvolucoes((data || []) as Evolucao[]);
  }

  function formatarDataBR(data: string) {
    if (!data) return "";

    if (data.includes("/")) return data;

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

 async function atualizarStatus(novoStatus: string) {
  if (!sessao) return;

  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await updateSessao(user.id, Number(sessao.id), {
    status: novoStatus,
  });

  if (error) {
    mostrarMensagem(
      "Erro ao atualizar status: " + error.message
    );
    return;
  }

  if (
    novoStatus === "Presente" ||
    novoStatus === "Faltou"
  ) {
    await deleteFrequenciaPorSessao(user.id, Number(sessao.id));

    await insertFrequencia({
      user_id: user.id,
      sessao_id: Number(sessao.id),
      paciente_id: Number(sessao.paciente_id),
      paciente_nome: sessao.paciente_nome,
      data: sessao.data,
      status: novoStatus,
    });
  }

  if (novoStatus === "Cancelada") {
    window.location.href = "/agenda";
    return;
  }

  mostrarMensagem(
    `Sessão marcada como ${novoStatus}.`
  );

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
async function reagendarSessao() {
  if (!sessao || !novaData || !novaHora) {
    mostrarMensagem("Informe a nova data e o novo horário.");
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await updateSessao(user.id, Number(id), {
    data: novaData,
    hora: novaHora,
    status: "Agendada",
  });

  if (error) {
    mostrarMensagem("Erro ao reagendar: " + error.message);
    return;
  }

  setAbrirReagendar(false);

  mostrarMensagem("Sessão reagendada com sucesso.");

  carregarSessao();
}
  async function salvarEvolucao() {
    if (!sessao) return;

    const user = await getCurrentUser();

    if (!user) {
      mostrarMensagem("Faça login novamente.");
      return;
    }

    const { error } = await insertEvolucao({
      user_id: user.id,
      sessao_id: Number(sessao.id),
      paciente_id: Number(sessao.paciente_id),
      data: new Date().toISOString().split("T")[0],
      queixa,
      objetivo,
      intervencao,
      observacoes,
      plano,
      encaminhamentos,
    });

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

<button
  className="btn btn-outline"
  onClick={() => setAbrirReagendar(!abrirReagendar)}
>
  Reagendar
</button>

<button className="btn btn-outline" onClick={gerarReciboPDF}>
  Gerar recibo
</button>
        </div>
{abrirReagendar && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr auto",
      gap: "12px",
      marginTop: "18px",
      alignItems: "center",
    }}
  >
    <input
      type="date"
      value={novaData}
      onChange={(e) => setNovaData(e.target.value)}
    />

    <input
      type="time"
      value={novaHora}
      onChange={(e) => setNovaHora(e.target.value)}
    />

    <button className="btn btn-green" onClick={reagendarSessao}>
      Salvar
    </button>
  </div>
)}
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

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor?: string | null;
}) {
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
