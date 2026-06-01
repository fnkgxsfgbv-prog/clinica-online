#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== PsicoDesk — publicar em produção ==="
echo ""

if ! npx --yes vercel@48.8.0 whoami >/dev/null 2>&1; then
  echo "Faça login na Vercel (abre o browser)..."
  npx --yes vercel@48.8.0 login
fi

echo ""
echo "Rodando testes..."
npm test

echo ""
echo "Enviando código para a Vercel..."
npx --yes vercel@48.8.0 deploy --prod --yes

echo ""
echo "Deploy concluído."
echo "No PsicoDesk: Cmd+Q → abrir de novo → Cmd+Shift+R no Painel."
