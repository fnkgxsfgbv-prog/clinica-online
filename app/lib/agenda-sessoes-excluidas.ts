const PREFIX = "psicodesk-sessoes-excluidas:";

function chave(userId: string) {
  return `${PREFIX}${userId}`;
}

function lerIds(userId: string): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(chave(userId));
    if (!raw) return new Set();
    const lista = JSON.parse(raw) as unknown;
    if (!Array.isArray(lista)) return new Set();
    return new Set(lista.map(String));
  } catch {
    return new Set();
  }
}

function gravarIds(userId: string, ids: Set<string>) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(chave(userId), JSON.stringify([...ids]));
}

export function marcarSessoesExcluidasLocal(
  userId: string,
  ids: Iterable<string | number>
) {
  const atual = lerIds(userId);
  for (const id of ids) atual.add(String(id));
  gravarIds(userId, atual);
}

export function limparSessaoExcluidaLocal(
  userId: string,
  id: string | number
) {
  const atual = lerIds(userId);
  atual.delete(String(id));
  gravarIds(userId, atual);
}

export function filtrarSessoesExcluidasLocalmente<
  T extends { id?: string | number | null },
>(userId: string, sessoes: T[]): T[] {
  const excluidas = lerIds(userId);
  if (excluidas.size === 0) return sessoes;
  return sessoes.filter((s) => !excluidas.has(String(s.id)));
}

export function idsSessoesExcluidasLocalmente(userId: string): Set<string> {
  return lerIds(userId);
}
