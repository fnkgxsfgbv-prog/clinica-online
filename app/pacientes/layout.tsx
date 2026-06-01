import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pacientes — PsicoDesk",
  description: "Lista e cadastro de pacientes.",
};

export default function PacientesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
