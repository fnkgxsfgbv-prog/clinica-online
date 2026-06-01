import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Paciente — PsicoDesk",
  description: "Prontuário, sessões e evoluções.",
};

export default function PacienteIdLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
