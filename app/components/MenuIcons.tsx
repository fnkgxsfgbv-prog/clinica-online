import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export type MenuIconName =
  | "painel"
  | "pacientes"
  | "agenda"
  | "financeiro"
  | "documentos"
  | "frequencia"
  | "clinica"
  | "preferencias";

export function MenuIcon({
  name,
  ...props
}: IconProps & { name: MenuIconName }) {
  switch (name) {
    case "painel":
      return (
        <svg {...base} {...props}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "pacientes":
      return (
        <svg {...base} {...props}>
          <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
          <circle cx="10" cy="8" r="3.25" />
          <path d="M19 19v-1a3 3 0 0 0-2-2.83" />
          <path d="M16 4.17a3 3 0 0 1 0 5.66" />
        </svg>
      );
    case "agenda":
      return (
        <svg {...base} {...props}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
          <path d="M9 14h2M13 14h2M9 17h2" />
        </svg>
      );
    case "financeiro":
      return (
        <svg {...base} {...props}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h2" />
        </svg>
      );
    case "documentos":
      return (
        <svg {...base} {...props}>
          <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-4-5Z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "frequencia":
      return (
        <svg {...base} {...props}>
          <path d="M5 6.5c2-1.8 4.5-1.8 7 0" />
          <path d="M5 6.5v11.5c2-1.8 4.5-1.8 7 0V6.5" />
          <path d="M12 6.5v11.5" />
          <path d="M19 6.5c-2-1.8-4.5-1.8-7 0" />
          <path d="M19 6.5v11.5c-2-1.8-4.5-1.8-7 0" />
        </svg>
      );
    case "clinica":
      return (
        <svg {...base} {...props}>
          <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M15 4v4h4" />
          <path d="M8 12h8M8 16h5" />
        </svg>
      );
    case "preferencias":
      return (
        <svg {...base} {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    default:
      return null;
  }
}
