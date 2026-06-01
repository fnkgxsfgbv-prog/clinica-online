#!/usr/bin/env bash
# Aponta o PsicoDesk.app (Safari Web App no Mac) para o site em produção na Vercel.
set -euo pipefail

PRODUCTION_URL="${PRODUCTION_URL:-https://clinica-online-ten.vercel.app}"
APP="${PSICODESK_APP:-$HOME/Applications/PsicoDesk.app}"
PLIST="$APP/Contents/Info.plist"

if [[ ! -f "$PLIST" ]]; then
  echo "PsicoDesk não encontrado em: $APP"
  echo ""
  echo "Instale manualmente:"
  echo "  1. Abra $PRODUCTION_URL no Safari"
  echo "  2. Arquivo → Adicionar ao Dock (ou Compartilhar → Adicionar ao Dock)"
  echo "  3. Renomeie o ícone para PsicoDesk se quiser"
  exit 1
fi

BASE="${PRODUCTION_URL%/}"

/usr/libexec/PlistBuddy -c "Set :Manifest:start_url ${BASE}/" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :WKManifestURL ${BASE}/site.webmanifest" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :WKPushBundleMetadata:manifestId ${BASE}/" "$PLIST"

echo "PsicoDesk atualizado para: $BASE"
echo "Feche o app (Cmd+Q) e abra de novo pelo Dock."
