#!/usr/bin/env bash
# =============================================================================
# LocAI Console — Stop Script
# =============================================================================
# Usage:
#   ./stop.sh                          Stop dev servers (frees :4001 & :4002)
#   ./stop.sh --docker                 + stop all Docker containers
#   ./stop.sh --purge                  + remove all Docker images & build cache
#   ./stop.sh --api-port 3001          Custom API server port to free
#   ./stop.sh --ui-port  3002          Custom frontend port to free
#   ./stop.sh --help
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
API_PORT=4001
UI_PORT=4002
STOP_DOCKER=false
PURGE_DOCKER=false

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-port) API_PORT="$2";  shift 2 ;;
    --ui-port)  UI_PORT="$2";   shift 2 ;;
    --docker)   STOP_DOCKER=true; shift ;;
    --purge)    STOP_DOCKER=true; PURGE_DOCKER=true; shift ;;
    --help|-h)
      cat <<'HELP'
Usage: ./stop.sh [OPTIONS]

Options:
  --api-port PORT   Port used by the API server to free  (default: 4001)
  --ui-port  PORT   Port used by the frontend to free    (default: 4002)
  --docker          Also stop all running Docker containers
  --purge           Stop containers AND remove all images + build cache
  --help, -h        Show this help message

Examples:
  ./stop.sh                              # kill dev servers on :4001 & :4002
  ./stop.sh --api-port 3001             # kill dev server on custom port
  ./stop.sh --docker                    # kill servers + stop Docker containers
  ./stop.sh --purge                     # full cleanup: servers + Docker wipe
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

log()    { echo -e "${CYAN}[hermes]${RESET} $*"; }
ok()     { echo -e "${GREEN}[hermes]${RESET} ✓ $*"; }
warn()   { echo -e "${YELLOW}[hermes]${RESET} ⚠ $*"; }
section(){ echo -e "\n${BOLD}$*${RESET}"; }

# ── Helper: kill processes listening on a TCP port ─────────────────────────────
free_port() {
  local port="$1"
  local label="$2"

  local pids
  pids=$(lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)

  if [[ -z "$pids" ]]; then
    echo -e "  ${DIM}Port $port ($label) — not in use, nothing to do${RESET}"
    return
  fi

  # Show what we're killing
  while IFS= read -r pid; do
    local cmd
    cmd=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
    echo -e "  ${RED}↓${RESET} Killing PID $pid ($cmd) on :$port ($label)"
    kill -9 "$pid" 2>/dev/null || true
  done <<< "$pids"

  ok "Port $port freed."
}

# ── Step 1: Kill dev servers ───────────────────────────────────────────────────
section "── Dev Servers ──────────────────────────────────────────────"
free_port "$API_PORT" "API server"
free_port "$UI_PORT"  "Frontend"

# ── Step 2: Docker containers ──────────────────────────────────────────────────
if [[ "$STOP_DOCKER" == true ]]; then
  section "── Docker Containers ────────────────────────────────────────"

  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found — skipping container cleanup."
  else
    local_containers=$(docker ps -q 2>/dev/null || true)

    if [[ -z "$local_containers" ]]; then
      echo -e "  ${DIM}No running containers.${RESET}"
    else
      echo -e "  Stopping and removing containers…"
      docker ps --format "  ${RED}↓${RESET} {{.Names}} ({{.Image}})" 2>/dev/null || true
      docker stop $(docker ps -q) 2>/dev/null || true
      docker rm   $(docker ps -aq) 2>/dev/null || true
      ok "All containers stopped and removed."
    fi

    # Also remove any exited containers that weren't running
    stale=$(docker ps -aq 2>/dev/null || true)
    if [[ -n "$stale" ]]; then
      docker rm $stale 2>/dev/null || true
      ok "Stale containers removed."
    fi
  fi
fi

# ── Step 3: Docker purge (images + cache) ─────────────────────────────────────
if [[ "$PURGE_DOCKER" == true ]]; then
  section "── Docker Images & Cache ────────────────────────────────────"

  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found — skipping image cleanup."
  else
    image_count=$(docker images -q 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$image_count" -eq 0 ]]; then
      echo -e "  ${DIM}No images to remove.${RESET}"
    else
      echo -e "  Removing $image_count image(s)…"
      docker images --format "  ${RED}✕${RESET} {{.Repository}}:{{.Tag}} ({{.Size}})" 2>/dev/null || true
      docker rmi -f $(docker images -q) 2>/dev/null || true
      ok "All images removed."
    fi

    echo -e "  Running docker system prune…"
    reclaimed=$(docker system prune -af --volumes 2>&1 | grep -i "reclaimed\|Total" || true)
    if [[ -n "$reclaimed" ]]; then
      ok "$reclaimed"
    else
      ok "Docker system pruned."
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Done.${RESET}"
echo -e "  Dev servers on :${API_PORT} (API) and :${UI_PORT} (frontend) have been stopped."
[[ "$STOP_DOCKER" == true ]]  && echo -e "  Docker containers stopped and removed."
[[ "$PURGE_DOCKER" == true ]]  && echo -e "  Docker images and build cache purged."
echo ""
echo -e "  ${DIM}Run ${BOLD}./start.sh${DIM} to start again.${RESET}"
