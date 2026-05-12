"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function EditarPaciente() {
  const { id } = useParams();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [observacoes, setObservacoes] = useState("");

  async function carregar() {
    const { data } = await supabase
      .from("pacientes")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setNome(data.nome || "");
      setTelefone(data.telefone || "");
      setResponsavel(data.responsavel || "");
      setDiagnostico(data.diagnostico || "");
      setObservacoes(data.observacoes || "");
    }
  }

  useEffect(() => {
    if (id) carregar();
  }, [id]);

  async function salvar() {
    await supabase
      .from("pacientes")
      .update({
        nome,
        telefone,
        responsavel,
        diagnostico,
        observacoes,
      })
      .eq("id", id);

    router.push(`/paciente/${id}`);
  }

  return (
    <main style={{ padding: "40px" }}>
      <button onClick={() => router.back()}>Voltar</button>

      <h1>Editar paciente</h1>

      <input value={nome} onChange={(e) => setNome(e.target.value)} />
      <br /><br />

      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      <br /><br />

      <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
      <br /><br />

      <input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
      <br /><br />

      <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      <br /><br />

      <button onClick={salvar}>Salvar</button>
    </main>
  );
}