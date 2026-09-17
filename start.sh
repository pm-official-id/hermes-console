#!/usr/bin/env bash
# =============================================================================
# LocAI Console — Local Development Startup Script
# =============================================================================
# Usage:  ./start.sh [--api-port <port>] [--ui-port <port>]
#         ./start.sh --help
#
# Opens two terminal windows:
#   • Window 1 — API server  (Express + DockerAdapter)  → default :4001
#   • Window 2 — Frontend    (Vite dev server)           → default :4002
#
# The Vite server proxies /api/* → API server automatically.
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
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
      echo "Access the app at:  http://localhost:<UI_PORT>"
      echo "API health check:   http://localhost:<API_PORT>/api/healthz"
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
command -v bun  >/dev/null 2>&1 || fail "bun is not installed. Visit https://bun.sh"
command -v node >/dev/null 2>&1 || fail "node is not installed."

# Warn (but don't abort) if ports are occupied
for PORT_CHECK in "$API_PORT" "$UI_PORT"; do
  if lsof -iTCP:"$PORT_CHECK" -sTCP:LISTEN -t >/dev/null 2>&1; then
    warn "Port $PORT_CHECK is already in use — the server may fail to bind."
  fi
done

# ── Build API server if dist is missing ───────────────────────────────────────
if [[ ! -f "$API_DIR/dist/index.mjs" ]]; then
  log "Building API server for the first time…"
  (cd "$API_DIR" && bun run build)
  ok "API server built."
fi

# ── Write launcher scripts to temp files ──────────────────────────────────────
# Embedding commands with quotes directly inside AppleScript strings causes
# syntax errors; writing them to temp files sidesteps this entirely.
TMP_API=$(mktemp /tmp/hermes-api-XXXXXX.sh)
TMP_UI=$(mktemp  /tmp/hermes-ui-XXXXXX.sh)

# Ensure temp files are removed when the script exits
trap 'rm -f "$TMP_API" "$TMP_UI"' EXIT

cat > "$TMP_API" <<SCRIPT
#!/usr/bin/env bash
printf '\\033[1;36m── LocAI API Server (port $API_PORT) ──\\033[0m\\n'
cd '$API_DIR'
PORT=$API_PORT NODE_ENV=development node --enable-source-maps ./dist/index.mjs
printf '\\033[1;31m\\nAPI server exited. Press Enter to close.\\033[0m\\n'
read -r
SCRIPT

cat > "$TMP_UI" <<SCRIPT
#!/usr/bin/env bash
printf '\\033[1;36m── LocAI Frontend (port $UI_PORT) ──\\033[0m\\n'
sleep 1
cd '$UI_DIR'
PORT=$UI_PORT BASE_PATH=/ API_PORT=$API_PORT bun run dev
printf '\\033[1;31m\\nFrontend exited. Press Enter to close.\\033[0m\\n'
read -r
SCRIPT

chmod +x "$TMP_API" "$TMP_UI"

# ── OS-specific terminal launch ───────────────────────────────────────────────
OS="$(uname -s)"

open_terminal_macos() {
  local title="$1"
  local script_path="$2"

  # Try iTerm2 first
  if osascript -e 'tell application "iTerm2" to get version' >/dev/null 2>&1; then
    osascript <<APPLESCRIPT
tell application "iTerm2"
  activate
  tell current window
    create tab with default profile
    tell current session of current tab
      set name to "$title"
      write text "exec $script_path"
    end tell
  end tell
end tell
APPLESCRIPT
  else
    # Fall back to Terminal.app — use a separate window per service
    osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "exec $script_path"
end tell
APPLESCRIPT
  fi
}

open_terminal_linux() {
  local title="$1"
  local script_path="$2"

  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --title="$title" -- bash "$script_path"
  elif command -v xterm >/dev/null 2>&1; then
    xterm -title "$title" -e bash "$script_path" &
  elif command -v konsole >/dev/null 2>&1; then
    konsole --new-tab -p "tabtitle=$title" -e bash "$script_path" &
  elif command -v xfce4-terminal >/dev/null 2>&1; then
    xfce4-terminal --title="$title" -e "bash $script_path" &
  else
    fail "No supported terminal emulator found (tried gnome-terminal, xterm, konsole, xfce4-terminal)."
  fi
}

# ── Launch! ───────────────────────────────────────────────────────────────────
log "Starting LocAI Console…"
log "  API server → http://localhost:${API_PORT}/api"
log "  Frontend   → http://localhost:${UI_PORT}"
echo ""

if [[ "$OS" == "Darwin" ]]; then
  open_terminal_macos "LocAI — API Server [:$API_PORT]" "$TMP_API"
  sleep 0.5
  open_terminal_macos "LocAI — Frontend   [:$UI_PORT]"  "$TMP_UI"
elif [[ "$OS" == "Linux" ]]; then
  open_terminal_linux "LocAI — API Server [:$API_PORT]" "$TMP_API"
  sleep 0.5
  open_terminal_linux "LocAI — Frontend   [:$UI_PORT]"  "$TMP_UI"
else
  fail "Unsupported OS: $OS"
fi

echo ""
ok "Both terminals launched."
echo -e "  ${BOLD}App URL:${RESET}    http://localhost:${UI_PORT}"
echo -e "  ${BOLD}API health:${RESET} http://localhost:${API_PORT}/api/healthz"
echo ""
echo -e "  ${YELLOW}Tip:${RESET} Rebuild API after code changes:"
echo -e "       cd artifacts/api-server && bun run build"

# Keep temp files alive long enough for the terminal to exec them
sleep 3
