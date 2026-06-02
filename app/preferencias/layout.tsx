import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Preferências — PsicoDesk",
};

export default function PreferenciasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
