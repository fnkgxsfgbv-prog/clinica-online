import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Frequência — PsicoDesk",
  description: "Registro de presenças e faltas.",
};

export default function FrequenciaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
