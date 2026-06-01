import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Minha clínica — PsicoDesk",
};

export default function MinhaClinicaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
