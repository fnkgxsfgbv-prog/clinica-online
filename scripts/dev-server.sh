#!/usr/bin/env bash
# Inicia ou para o Next.js fora do VS Code/Cursor (sobrevive ao fechar o editor).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.dev-server.pid"
LOG_DIR="$ROOT/.logs"
LOG_FILE="$LOG_DIR/dev.log"
PORT="${PORT:-3000}"

mkdir -p "$LOG_DIR"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  kill -0 "$pid" 2>/dev/null
}

start() {
  if is_running; then
    echo "Servidor já está rodando (PID $(cat "$PID_FILE"))."
    echo "Acesse: http://localhost:${PORT}"
    exit 0
  fi

  cd "$ROOT"
  if [[ ! -x "$ROOT/node_modules/.bin/next" ]]; then
    echo "Execute npm install antes de iniciar o servidor."
    exit 1
  fi

  nohup "$ROOT/node_modules/.bin/next" dev -p "$PORT" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1

  if ! is_running; then
    echo "Falha ao iniciar. Veja o log:"
    tail -n 20 "$LOG_FILE" || true
    rm -f "$PID_FILE"
    exit 1
  fi

  echo "Servidor iniciado em segundo plano (PID $(cat "$PID_FILE"))."
  echo "URL: http://localhost:${PORT}"
  echo "Log: $LOG_FILE"
  echo "Para parar: npm run dev:stop"
}

stop() {
  if ! is_running; then
    rm -f "$PID_FILE"
    echo "Servidor não está rodando."
    exit 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  echo "Servidor encerrado."
}

status() {
  if is_running; then
    echo "Rodando (PID $(cat "$PID_FILE")) — http://localhost:${PORT}"
  else
    echo "Parado."
    rm -f "$PID_FILE"
    exit 1
  fi
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  restart) stop; start ;;
  *)
    echo "Uso: $0 {start|stop|status|restart}"
    exit 1
    ;;
esac
