import type { ReactNode } from "react";

type FlashKind = "error" | "success" | "info";

export default function FlashMessage({
  kind,
  children,
  id,
}: {
  kind: FlashKind;
  children: ReactNode;
  id?: string;
}) {
  const cls =
    kind === "error"
      ? "app-flash app-flash-error"
      : kind === "success"
        ? "app-flash app-flash-success"
        : "app-flash app-flash-info";

  return (
    <div
      id={id}
      className={cls}
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
    >
      {children}
    </div>
  );
}
