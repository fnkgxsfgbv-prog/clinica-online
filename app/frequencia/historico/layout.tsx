import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Histórico de frequência — PsicoDesk",
  description: "Resumo mensal de comparecimento por paciente.",
};

export default function HistoricoFrequenciaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
