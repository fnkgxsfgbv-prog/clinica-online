import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Agenda — PsicoDesk",
  description: "Calendário de sessões e atendimentos.",
};

export default function AgendaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
