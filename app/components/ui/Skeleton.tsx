"use client";

import type { CSSProperties, ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
};

function classeRounded(rounded: SkeletonProps["rounded"]) {
  switch (rounded) {
    case "sm":
      return "ds-skeleton--sm";
    case "lg":
      return "ds-skeleton--lg";
    case "full":
      return "ds-skeleton--full";
    default:
      return "ds-skeleton--md";
  }
}

export function Skeleton({
  className = "",
  style,
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  return (
    <span
      className={`ds-skeleton ${classeRounded(rounded)} ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonStack({
  children,
  className = "",
  gap = 12,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  return (
    <div className={`ds-skeleton-stack ${className}`.trim()} style={{ gap }}>
      {children}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="ds-skeleton-dashboard" aria-busy="true" aria-label="Carregando dashboard">
      <Skeleton height={14} width="28%" />
      <div className="ds-skeleton-dashboard-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ds-skeleton-card">
            <Skeleton height={12} width="55%" />
            <Skeleton height={28} width="40%" style={{ marginTop: 10 }} />
            <Skeleton height={10} width="70%" style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
      <div className="ds-skeleton-card ds-skeleton-card--tall">
        <Skeleton height={16} width="32%" />
        <Skeleton height={12} width="100%" style={{ marginTop: 16 }} />
        <Skeleton height={12} width="92%" style={{ marginTop: 8 }} />
        <Skeleton height={12} width="78%" style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}

export function PatientsSkeleton() {
  return (
    <div className="ds-skeleton-patients" aria-busy="true" aria-label="Carregando pacientes">
      <div className="ds-skeleton-toolbar">
        <Skeleton height={40} width="100%" style={{ maxWidth: 340 }} />
        <Skeleton height={40} width={180} />
        <Skeleton height={40} width={160} />
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="ds-skeleton-patient-row">
          <Skeleton height={14} width="34%" />
          <Skeleton height={22} width={72} rounded="sm" />
          <Skeleton height={12} width="18%" />
          <Skeleton height={12} width="14%" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="ds-skeleton-page" aria-busy="true" aria-label="Carregando">
      <Skeleton height={18} width="30%" />
      <Skeleton height={12} width="50%" style={{ marginTop: 10 }} />
      <div className="ds-skeleton-stack" style={{ marginTop: 20, gap: 10 }}>
        {Array.from({ length: linhas }).map((_, index) => (
          <Skeleton key={index} height={14} width={`${88 - index * 6}%`} />
        ))}
      </div>
    </div>
  );
}
