"use client";

import { Suspense } from "react";
import AgendaClient from "./AgendaClient";
import { PageSkeleton } from "../components/ui/Skeleton";

export default function AgendaPage() {
  return (
    <Suspense
      fallback={
        <div className="agenda-page-shell">
          <PageSkeleton linhas={6} />
        </div>
      }
    >
      <AgendaClient />
    </Suspense>
  );
}
