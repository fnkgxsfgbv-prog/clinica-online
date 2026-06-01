"use client";

import { Suspense } from "react";
import AgendaClient from "./AgendaClient";

export default function AgendaPage() {
  return (
    <Suspense
      fallback={
        <div className="agenda-page-shell">
          <p className="empty-text" style={{ padding: "32px 24px" }}>
            Carregando agenda…
          </p>
        </div>
      }
    >
      <AgendaClient />
    </Suspense>
  );
}
