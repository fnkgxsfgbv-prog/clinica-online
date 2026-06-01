import { describe, expect, it } from "vitest";
import {
  criarDataHoraSessao,
  mesmaDataAgenda,
  sessaoPassaFiltroAgenda,
  statusParaFiltroAgenda,
} from "./agenda-sessao";

describe("sessaoPassaFiltroAgenda", () => {
  it("em Todos mostra qualquer status", () => {
    expect(sessaoPassaFiltroAgenda("Presente", "todos")).toBe(true);
    expect(sessaoPassaFiltroAgenda("Faltou", "todos")).toBe(true);
    expect(sessaoPassaFiltroAgenda("Agendada", "todos")).toBe(true);
    expect(sessaoPassaFiltroAgenda("Cancelada", "todos")).toBe(true);
  });

  it("filtra por status normalizado", () => {
    expect(sessaoPassaFiltroAgenda("Presente", "presente")).toBe(true);
    expect(sessaoPassaFiltroAgenda("Falta", "faltou")).toBe(true);
    expect(sessaoPassaFiltroAgenda("Presente", "faltou")).toBe(false);
  });
});

describe("statusParaFiltroAgenda", () => {
  it("normaliza variantes", () => {
    expect(statusParaFiltroAgenda("Falta")).toBe("faltou");
    expect(statusParaFiltroAgenda("Agendada")).toBe("agendada");
  });
});

describe("mesmaDataAgenda", () => {
  it("compara ISO e datetime", () => {
    expect(mesmaDataAgenda("2026-05-20T15:00:00", "2026-05-20")).toBe(true);
    expect(mesmaDataAgenda("2026-05-19", "2026-05-20")).toBe(false);
  });
});

describe("criarDataHoraSessao", () => {
  it("aceita data com horário ISO do banco", () => {
    const d = criarDataHoraSessao("2026-05-20T03:00:00.000Z", "14:30");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getDate()).toBe(20);
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  it("retorna null para data inválida", () => {
    expect(criarDataHoraSessao("", "10:00")).toBeNull();
  });
});
