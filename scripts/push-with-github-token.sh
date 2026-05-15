#!/usr/bin/env bash
# Envia a branch atual para origin usando um token (evita "Device not configured").
# Token: https://github.com/settings/tokens (classic: escopo repo)
#
#   GITHUB_TOKEN=ghp_xxxx bash scripts/push-with-github-token.sh
#   npm run push:github

set -euo pipefail

TOKEN="${GITHUB_TOKEN:?Defina GITHUB_TOKEN (PAT com escopo repo).}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE_URL="$(git remote get-url origin)"
case "$REMOTE_URL" in
  *github.com*)
    ;;
  *)
    echo "origin não parece ser GitHub: $REMOTE_URL"
    exit 1
    ;;
esac

# https://github.com/OWNER/REPO.git → OWNER/REPO
path="${REMOTE_URL#*github.com/}"
path="${path%.git}"
# git@github.com:OWNER/REPO.git
if [[ "$REMOTE_URL" == git@github.com:* ]]; then
  path="${REMOTE_URL#git@github.com:}"
  path="${path%.git}"
fi
if [[ "$path" != */* ]]; then
  echo "Não consegui extrair OWNER/REPO de: $REMOTE_URL"
  exit 1
fi

echo "→ git push para github.com/${path} …"
git push "https://oauth2:${TOKEN}@github.com/${path}.git" HEAD:main

echo "→ OK. Próximo: Vercel → Import → ${path}"
