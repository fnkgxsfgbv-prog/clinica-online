#!/usr/bin/env bash
# Cria o repositório no GitHub (conta pessoal) e envia a branch main.
#
# 1) GitHub → Settings → Developer settings → Personal access tokens
#    (classic: repo) ou fine-grained: conteúdo do repositório read/write.
# 2) No terminal:
#      GITHUB_TOKEN=ghp_xxxx \
#      GITHUB_OWNER=joaopcvoliveira-sudo \
#        bash scripts/github-init-push.sh
#
# GITHUB_OWNER = usuário dono do repo (Vercel mostrou joaopcvoliveira-sudo).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN="${GITHUB_TOKEN:?Defina GITHUB_TOKEN (PAT do GitHub com escopo repo).}"
OWNER="${GITHUB_OWNER:-joaopcvoliveira-sudo}"
REPO="${GITHUB_REPO:-clinica-online}"

echo "→ Criando ${OWNER}/${REPO} no GitHub (ignora se já existir)..."
HTTP_CODE="$(curl -sS -o /tmp/gh-create-repo.json -w "%{http_code}" -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/user/repos" \
  -d "{\"name\":\"${REPO}\",\"private\":true,\"description\":\"PsicoDesk (clinica-online)\"}")"

if [[ "$HTTP_CODE" == "201" ]]; then
  echo "   Repositório criado."
elif [[ "$HTTP_CODE" == "422" ]]; then
  echo "   Já existe (422) — seguindo para o push."
else
  echo "   Resposta HTTP ${HTTP_CODE}:"
  cat /tmp/gh-create-repo.json
  echo ""
  echo "Se 404/403, confira o token e o GITHUB_OWNER (tem de ser o user do token)."
  exit 1
fi

cd "$ROOT"
git remote set-url origin "https://github.com/${OWNER}/${REPO}.git"

echo "→ Enviando main para origin..."
# Push com token na URL (não fica salvo em remote após o comando)
git push "https://oauth2:${TOKEN}@github.com/${OWNER}/${REPO}.git" main

git branch --set-upstream-to="origin/main" main 2>/dev/null || true

echo ""
echo "Pronto. Remoto: https://github.com/${OWNER}/${REPO}"
echo "Na Vercel: Import → escolha esse repositório → env vars Supabase → Deploy."
