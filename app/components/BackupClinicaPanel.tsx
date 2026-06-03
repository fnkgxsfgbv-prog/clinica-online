"use client";

import { useRef, useState } from "react";

import {
  baixarBackupClinica,
  lerArquivoBackupClinica,
  resumoBackupClinica,
  type BackupClinicaPayload,
  type BackupClinicaPerfil,
  type BackupClinicaResumo,
  type ModoRestauracaoBackup,
} from "../lib/backup-clinica";
import { exportarBackupClinicaCompleto } from "../lib/backup-clinica-export";
import { restaurarBackupClinica } from "../lib/backup-clinica-restore";

type Props = {
  userId: string;
  perfil?: BackupClinicaPerfil;
  temDadosBasicos: boolean;
  onConcluido?: () => void | Promise<void>;
};

function formatarResumo(resumo: BackupClinicaResumo) {
  return [
    `${resumo.pacientes} pacientes`,
    `${resumo.sessoes} sessões`,
    `${resumo.evolucoes} evoluções`,
    `${resumo.anamneses} anamneses`,
    `${resumo.formularios} formulários`,
    `${resumo.documentos} documentos (${resumo.arquivosDocumentos} arquivos)`,
    `${resumo.documentoModelos + resumo.formularioModelos} modelos`,
  ].join(" · ");
}

export default function BackupClinicaPanel({
  userId,
  perfil,
  temDadosBasicos,
  onConcluido,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [exportando, setExportando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [preview, setPreview] = useState<{
    payload: BackupClinicaPayload;
    resumo: BackupClinicaResumo;
    nomeArquivo: string;
  } | null>(null);
  const [modo, setModo] = useState<ModoRestauracaoBackup>("mesclar");
  const [confirmarSubstituir, setConfirmarSubstituir] = useState("");

  async function exportarCompleto() {
    setExportando(true);
    setErro("");
    setMensagem("");
    setProgresso("Preparando backup…");

    try {
      const payload = await exportarBackupClinicaCompleto(
        userId,
        perfil,
        (p) => {
          if (p.total > 1) {
            setProgresso(`${p.etapa} (${p.atual}/${p.total})…`);
          } else {
            setProgresso(`${p.etapa}…`);
          }
        }
      );
      baixarBackupClinica(payload);
      const resumo = resumoBackupClinica(payload);
      const omitidos =
        resumo.arquivosDocumentosOmitidos + resumo.arquivosModelosOmitidos;
      setMensagem(
        omitidos > 0
          ? `Backup baixado. ${omitidos} arquivo(s) grande(s) ficaram só como metadado (sem conteúdo).`
          : "Backup completo baixado com sucesso."
      );
      setProgresso("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao exportar backup.");
      setProgresso("");
    } finally {
      setExportando(false);
    }
  }

  async function selecionarArquivo(file: File | null) {
    setErro("");
    setMensagem("");
    setPreview(null);
    setConfirmarSubstituir("");
    if (!file) return;

    const { payload, erro: erroLeitura } = await lerArquivoBackupClinica(file);
    if (!payload) {
      setErro(erroLeitura);
      return;
    }

    setPreview({
      payload,
      resumo: resumoBackupClinica(payload),
      nomeArquivo: file.name,
    });
  }

  async function executarRestauracao() {
    if (!preview) return;
    if (modo === "substituir" && confirmarSubstituir.trim() !== "SUBSTITUIR") {
      setErro('Digite SUBSTITUIR para apagar os dados atuais antes de restaurar.');
      return;
    }

    setRestaurando(true);
    setErro("");
    setMensagem("");
    setProgresso("Iniciando restauração…");

    try {
      await restaurarBackupClinica(userId, preview.payload, modo, (p) => {
        setProgresso(`${p.etapa} (${p.atual}/${p.total})…`);
      });
      setPreview(null);
      setConfirmarSubstituir("");
      setMensagem(
        modo === "substituir"
          ? "Backup restaurado. Os dados anteriores foram substituídos."
          : "Backup restaurado. Os registros do arquivo foram importados com novos IDs."
      );
      setProgresso("");
      await onConcluido?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao restaurar backup.");
      setProgresso("");
    } finally {
      setRestaurando(false);
    }
  }

  return (
    <div className="backup-clinica-panel">
      {erro ? <p className="backup-clinica-feedback backup-clinica-erro">{erro}</p> : null}
      {mensagem ? (
        <p className="backup-clinica-feedback backup-clinica-ok">{mensagem}</p>
      ) : null}
      {progresso ? (
        <p className="backup-clinica-feedback backup-clinica-progresso">{progresso}</p>
      ) : null}

      <div className="clinic-export-actions">
        <button
          type="button"
          className="btn btn-green"
          onClick={() => void exportarCompleto()}
          disabled={exportando || restaurando || !temDadosBasicos}
        >
          {exportando ? "Gerando backup…" : "Backup completo (JSON)"}
        </button>
      </div>

      <p className="backup-clinica-help">
        Inclui pacientes, sessões, frequência, evoluções, anamnese, formulários,
        documentos (até 10MB cada), modelos e dados da clínica.
      </p>

      <div className="backup-clinica-restore">
        <h3>Restaurar backup</h3>
        <p className="backup-clinica-help">
          Importe um arquivo <code>.json</code> exportado pelo PsicoDesk. Use{" "}
          <strong>Mesclar</strong> para acrescentar dados ou{" "}
          <strong>Substituir tudo</strong> para apagar a clínica atual antes.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="backup-clinica-file"
          onChange={(e) => void selecionarArquivo(e.target.files?.[0] ?? null)}
          disabled={exportando || restaurando}
        />

        {preview ? (
          <div className="backup-clinica-preview">
            <strong>{preview.nomeArquivo}</strong>
            <p>{formatarResumo(preview.resumo)}</p>
            <p className="backup-clinica-help">
              Exportado em{" "}
              {new Date(preview.resumo.exportadoEm).toLocaleString("pt-BR")}
            </p>

            <div className="backup-clinica-modos">
              <label className="backup-clinica-modo">
                <input
                  type="radio"
                  name="modo-restore"
                  checked={modo === "mesclar"}
                  onChange={() => setModo("mesclar")}
                />
                <span>
                  <strong>Mesclar</strong> — mantém o que já existe e importa cópias
                  novas
                </span>
              </label>
              <label className="backup-clinica-modo">
                <input
                  type="radio"
                  name="modo-restore"
                  checked={modo === "substituir"}
                  onChange={() => setModo("substituir")}
                />
                <span>
                  <strong>Substituir tudo</strong> — apaga pacientes, sessões e
                  prontuários atuais
                </span>
              </label>
            </div>

            {modo === "substituir" ? (
              <label className="backup-clinica-confirm">
                <span>Digite SUBSTITUIR para confirmar</span>
                <input
                  type="text"
                  value={confirmarSubstituir}
                  onChange={(e) => setConfirmarSubstituir(e.target.value)}
                  placeholder="SUBSTITUIR"
                  autoComplete="off"
                />
              </label>
            ) : null}

            <div className="clinic-export-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setPreview(null);
                  setConfirmarSubstituir("");
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={restaurando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-green"
                onClick={() => void executarRestauracao()}
                disabled={restaurando}
              >
                {restaurando ? "Restaurando…" : "Restaurar backup"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
