#!/usr/bin/env bash
# =============================================================================
# LocAI Console — Local Development Startup Script
# =============================================================================
# Usage:  ./start.sh [--api-port <port>] [--ui-port <port>]
#         ./start.sh --help
#
# Opens two terminal windows/tabs:
#   • Window 1: API server  (Express + DockerAdapter)  → default :4001
#   • Window 2: Frontend    (Vite dev server)           → default :4002
#
# The Vite server proxies /api/* to the API server automatically.
# =============================================================================

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
API_PORT=4001
UI_PORT=4002
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/artifacts/api-server"
UI_DIR="$ROOT_DIR/artifacts/locai-console"

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-port) API_PORT="$2"; shift 2 ;;
    --ui-port)  UI_PORT="$2";  shift 2 ;;
    --help|-h)
      echo "Usage: ./start.sh [--api-port PORT] [--ui-port PORT]"
      echo ""
      echo "Options:"
      echo "  --api-port PORT   Port for the Express API server  (default: 4001)"
      echo "  --ui-port  PORT   Port for the Vite dev server     (default: 4002)"
      echo ""
      echo "Access the app at: http://localhost:\$UI_PORT"
      echo "API is available at: http://localhost:\$API_PORT/api"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Colour helpers ────────────────────────────────────────────────────────────
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[hermes]${RESET} $*"; }
ok()   { echo -e "${GREEN}[hermes]${RESET} $*"; }
warn() { echo -e "${YELLOW}[hermes]${RESET} $*"; }
fail() { echo -e "${RED}[hermes]${RESET} $*" >&2; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
command -v bun  >/dev/null 2>&1 || fail "bun is not installed. Visit https://bun.sh to install it."
command -v node >/dev/null 2>&1 || fail "node is not installed."

# Check ports are free
for PORT_CHECK in "$API_PORT" "$UI_PORT"; do
  if lsof -iTCP:"$PORT_CHECK" -sTCP:LISTEN -t >/dev/null 2>&1; then
    warn "Port $PORT_CHECK is already in use. Choose a different port with --api-port / --ui-port."
  fi
done

# ── Build API server if dist is missing ──────────────────────────────────────
if [[ ! -f "$API_DIR/dist/index.mjs" ]]; then
  log "Building API server for the first time…"
  (cd "$API_DIR" && bun run build)
  ok "API server built."
fi

# ── Commands to run in each terminal ─────────────────────────────────────────
API_CMD="echo -e '\\033[1;36m── LocAI API Server (port $API_PORT) ──\\033[0m'; \
  cd \"$API_DIR\" && \
  PORT=$API_PORT NODE_ENV=development node --enable-source-maps ./dist/index.mjs; \
  echo -e '\\033[1;31mAPI server exited.\\033[0m'; read -r -p 'Press Enter to close…'"

UI_CMD="echo -e '\\033[1;36m── LocAI Frontend Dev Server (port $UI_PORT) ──\\033[0m'; \
  sleep 1; \
  cd \"$UI_DIR\" && \
  PORT=$UI_PORT BASE_PATH=/ API_PORT=$API_PORT bun run dev; \
  echo -e '\\033[1;31mFrontend exited.\\033[0m'; read -r -p 'Press Enter to close…'"

# ── OS-specific terminal launch ───────────────────────────────────────────────
OS="$(uname -s)"

open_terminal() {
  local title="$1"
  local cmd="$2"

  if [[ "$OS" == "Darwin" ]]; then
    # ── macOS: prefer iTerm2, fall back to Terminal.app ──────────────────
    if osascript -e 'tell application "iTerm2" to version' >/dev/null 2>&1; then
      osascript <<APPLESCRIPT
tell application "iTerm2"
  tell current window
    create tab with default profile
    tell current session of current tab
      set name to "$title"
      write text "$cmd"
    end tell
  end tell
end tell
APPLESCRIPT
    else
      # Terminal.app
      osascript <<APPLESCRIPT
tell application "Terminal"
  do script "$cmd"
  set custom title of tab 1 of window 1 to "$title"
end tell
APPLESCRIPT
    fi

  elif [[ "$OS" == "Linux" ]]; then
    # ── Linux: try common terminal emulators in order ────────────────────
    if command -v gnome-terminal >/dev/null 2>&1; then
      gnome-terminal --title="$title" -- bash -c "$cmd; exec bash"
    elif command -v xterm >/dev/null 2>&1; then
      xterm -title "$title" -e bash -c "$cmd; exec bash" &
    elif command -v konsole >/dev/null 2>&1; then
      konsole --new-tab -p tabtitle="$title" -e bash -c "$cmd; exec bash" &
    elif command -v xfce4-terminal >/dev/null 2>&1; then
      xfce4-terminal --title="$title" -e "bash -c \"$cmd; exec bash\"" &
    else
      fail "No supported terminal emulator found (tried gnome-terminal, xterm, konsole, xfce4-terminal)."
    fi

  else
    fail "Unsupported OS: $OS. Run the two commands manually:\n  API:      cd artifacts/api-server  && PORT=$API_PORT bun run dev\n  Frontend: cd artifacts/locai-console && PORT=$UI_PORT BASE_PATH=/ API_PORT=$API_PORT bun run dev"
  fi
}

# ── Launch! ───────────────────────────────────────────────────────────────────
log "Starting LocAI Console…"
log "  API server  → http://localhost:${API_PORT}/api"
log "  Frontend    → http://localhost:${UI_PORT}"
echo ""

open_terminal "LocAI — API Server [:$API_PORT]"   "$API_CMD"
sleep 0.5
open_terminal "LocAI — Frontend   [:$UI_PORT]"    "$UI_CMD"

echo ""
ok "Both terminals launched."
echo -e "  ${BOLD}Open the app:${RESET}  http://localhost:${UI_PORT}"
echo -e "  ${BOLD}API health:${RESET}    http://localhost:${API_PORT}/api/healthz"
echo ""
echo -e "  ${YELLOW}Tip:${RESET} To rebuild the API server after code changes:"
echo -e "       cd artifacts/api-server && bun run build"
