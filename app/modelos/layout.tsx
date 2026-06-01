import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Modelos — PsicoDesk",
  description: "Modelos de laudos, declarações e anamneses.",
};

export default function ModelosLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
