import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Novo paciente — PsicoDesk",
  description: "Cadastro de novo paciente.",
};

export default function NovoPacienteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
