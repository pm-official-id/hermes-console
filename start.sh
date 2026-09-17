#!/usr/bin/env bash
# =============================================================================
# LocAI Console — Local Development Startup Script
# =============================================================================
# Usage:
#   ./start.sh                         Dev mode: API :4001 + Vite :4002
#   ./start.sh --docker                Dev mode + rebuild & start Docker stack
#   ./start.sh --docker --no-dev       Docker stack only (no dev servers)
#   ./start.sh --rebuild               Force-rebuild API server bundle before start
#   ./start.sh --api-port 3001 --ui-port 3002   Custom ports
#   ./start.sh --help
#
# When --docker is passed:
#   1. Builds the production Docker image (docker compose build)
#   2. Starts the compose stack (docker compose up -d)
#      → this makes real containers visible to the DockerHostAdapter
#   3. (unless --no-dev) Opens two terminal windows for hot-reload dev work
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
API_PORT=4001
UI_PORT=4002
START_DOCKER=false
NO_DEV=false
FORCE_REBUILD=false
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/artifacts/api-server"
UI_DIR="$ROOT_DIR/artifacts/locai-console"

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-port)  API_PORT="$2";     shift 2 ;;
    --ui-port)   UI_PORT="$2";      shift 2 ;;
    --docker)    START_DOCKER=true; shift   ;;
    --no-dev)    NO_DEV=true;       shift   ;;
    --rebuild)   FORCE_REBUILD=true;shift   ;;
    --help|-h)
      cat <<'HELP'
Usage: ./start.sh [OPTIONS]

Options:
  --api-port PORT   Port for the Express API server        (default: 4001)
  --ui-port  PORT   Port for the Vite dev server           (default: 4002)
  --docker          Build & start the Docker compose stack first.
                    This makes service containers visible to the DockerAdapter
                    so the Services and Catalog pages show real data.
  --no-dev          Used with --docker: skip the dev server terminals.
                    Access the app at http://localhost:5001 (compose port).
  --rebuild         Force-rebuild the API server bundle even if dist/ exists.

Examples:
  ./start.sh                               Dev servers only (mock data)
  ./start.sh --docker                      Docker stack + dev servers (real data)
  ./start.sh --docker --no-dev            Docker stack only (production image)
  ./start.sh --rebuild                     Rebuild API, then open dev servers
  ./start.sh --api-port 3001 --ui-port 3002  Custom ports
HELP
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
DIM='\033[2m'
RESET='\033[0m'

log()     { echo -e "${CYAN}[hermes]${RESET} $*"; }
ok()      { echo -e "${GREEN}[hermes]${RESET} ✓ $*"; }
warn()    { echo -e "${YELLOW}[hermes]${RESET} ⚠ $*"; }
fail()    { echo -e "${RED}[hermes]${RESET} ✗ $*" >&2; exit 1; }
section() { echo -e "\n${BOLD}$*${RESET}"; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
command -v bun  >/dev/null 2>&1 || fail "bun is not installed. Visit https://bun.sh"
command -v node >/dev/null 2>&1 || fail "node is not installed."

if [[ "$START_DOCKER" == true ]]; then
  command -v docker >/dev/null 2>&1 || fail "docker is not installed. Visit https://docs.docker.com/get-docker/"
fi

# Warn (but don't abort) if dev ports are occupied
if [[ "$NO_DEV" == false ]]; then
  for PORT_CHECK in "$API_PORT" "$UI_PORT"; do
    if lsof -iTCP:"$PORT_CHECK" -sTCP:LISTEN -t >/dev/null 2>&1; then
      warn "Port $PORT_CHECK is already in use. Run ./stop.sh first or pick a different port."
    fi
  done
fi

# ── Step 1: Docker compose stack ──────────────────────────────────────────────
if [[ "$START_DOCKER" == true ]]; then
  section "── Docker Stack ──────────────────────────────────────────────"
  log "Building production image…"
  docker compose build 2>&1 | sed 's/^/  /'
  ok "Image built."

  log "Starting Docker stack (docker compose up -d)…"
  docker compose up -d 2>&1 | sed 's/^/  /'
  ok "Docker stack running."

  # Show what's up
  echo ""
  log "Running containers:"
  docker compose ps --format "  🐳 {{.Name}}  {{.Status}}" 2>/dev/null || docker compose ps
  echo ""

  if [[ "$NO_DEV" == true ]]; then
    # Production-only mode: serve from the container
    HOST_PORT="${HOST_PORT:-5001}"
    echo ""
    ok "All done — running in production mode."
    echo -e "  ${BOLD}App URL:${RESET}    http://localhost:${HOST_PORT}"
    echo -e "  ${BOLD}API health:${RESET} http://localhost:${HOST_PORT}/api/healthz"
    echo ""
    echo -e "  ${DIM}Logs: docker compose logs -f${RESET}"
    echo -e "  ${DIM}Stop: ./stop.sh --docker${RESET}"
    exit 0
  fi
fi

# ── Step 2: Build API server bundle if needed ─────────────────────────────────
section "── Dev Servers ──────────────────────────────────────────────"

if [[ "$FORCE_REBUILD" == true ]] || [[ ! -f "$API_DIR/dist/index.mjs" ]]; then
  log "Building API server bundle…"
  (cd "$API_DIR" && bun run build) 2>&1 | sed 's/^/  /'
  ok "API server built."
fi

# ── Step 3: Write launcher scripts to temp files ──────────────────────────────
# Embedding commands with quotes directly inside AppleScript strings causes
# syntax errors; writing them to temp .sh files sidesteps this entirely.
TMP_API=$(mktemp /tmp/hermes-api-XXXXXX.sh)
TMP_UI=$(mktemp  /tmp/hermes-ui-XXXXXX.sh)

trap 'rm -f "$TMP_API" "$TMP_UI"' EXIT

# Determine the active Docker socket path (useful for Colima/Rancher users)
DOCKER_SOCK=""
if command -v docker >/dev/null 2>&1; then
  DOCKER_SOCK=$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null | sed 's/^unix:\/\///' || echo "/var/run/docker.sock")
fi

cat > "$TMP_API" <<SCRIPT
#!/usr/bin/env bash
printf '\\033[1;36m── LocAI API Server (port $API_PORT) ──\\033[0m\\n'
cd '$API_DIR'
DOCKER_SOCKET_PATH="$DOCKER_SOCK" DOCKER_HOST="${DOCKER_HOST:-}" PORT=$API_PORT NODE_ENV=development node --enable-source-maps ./dist/index.mjs
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

# ── Step 4: OS-specific terminal launch ───────────────────────────────────────
OS="$(uname -s)"

open_terminal_macos() {
  local title="$1"
  local script_path="$2"

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
    fail "No supported terminal emulator found."
  fi
}

# ── Step 5: Launch terminals ──────────────────────────────────────────────────
log "Opening terminals…"

if [[ "$OS" == "Darwin" ]]; then
  open_terminal_macos "LocAI — API Server [:$API_PORT]" "$TMP_API"
  sleep 0.5
  open_terminal_macos "LocAI — Frontend   [:$UI_PORT]"  "$TMP_UI"
elif [[ "$OS" == "Linux" ]]; then
  open_terminal_linux "LocAI — API Server [:$API_PORT]" "$TMP_API"
  sleep 0.5
  open_terminal_linux "LocAI — Frontend   [:$UI_PORT]"  "$TMP_UI"
else
  fail "Unsupported OS: $OS. Run manually:\n  cd artifacts/api-server   && PORT=$API_PORT bun run start\n  cd artifacts/locai-console && PORT=$UI_PORT BASE_PATH=/ API_PORT=$API_PORT bun run dev"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
ok "Both terminals launched."
echo -e "  ${BOLD}App URL:${RESET}    http://localhost:${UI_PORT}"
echo -e "  ${BOLD}API health:${RESET} http://localhost:${API_PORT}/api/healthz"
[[ "$START_DOCKER" == true ]] && echo -e "  ${BOLD}Docker:${RESET}     http://localhost:${HOST_PORT:-5001}  (production build)"
echo ""
echo -e "  ${YELLOW}Tips:${RESET}"
echo -e "  • Rebuild API after code changes: ${DIM}cd artifacts/api-server && bun run build${RESET}"
echo -e "  • Stop everything:                ${DIM}./stop.sh${RESET}   or   ${DIM}./stop.sh --docker${RESET}"

# Keep temp files alive long enough for the terminal to exec them
sleep 3
