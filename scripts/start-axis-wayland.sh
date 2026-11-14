#!/usr/bin/env bash
set -euo pipefail

# Lanzador nativo de AXIS Desktop en Wayland (Niri / Hyprland) con GPU NVIDIA (RTX 5060 Ti).
# Mitiga pantalla negra o fallos EGL/DMA-BUF de WebKitGTK bajo controladores propietarios NVIDIA.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
export WEBKIT_DISABLE_COMPOSITING_MODE="${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"
export GDK_BACKEND="${GDK_BACKEND:-wayland,x11}"

usage() {
  cat <<'EOF'
Uso: start-axis-wayland.sh [--dev | --bin [ruta_binario]]

Opciones:
  --dev           Lanza 'pnpm tauri dev' con recarga Vite y variables WebKitGTK/NVIDIA.
  --bin [ruta]    Ejecuta el binario compilado ('axis-desktop' release o debug).
  -h, --help      Muestra esta ayuda.

Variables exportadas automáticamente (sobrescribibles):
  WEBKIT_DISABLE_DMABUF_RENDERER=1
  WEBKIT_DISABLE_COMPOSITING_MODE=1
  GDK_BACKEND=wayland,x11
  AURORA_DAEMON_URL (opcional, defecto http://127.0.0.1:8090 en axis-module-aurora)
EOF
}

MODO="auto"
BIN_EXPLICITO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      MODO="dev"
      shift
      ;;
    --bin)
      MODO="bin"
      if [[ $# -gt 1 && "$2" != --* ]]; then
        BIN_EXPLICITO="$2"
        shift 2
      else
        shift
      fi
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Opción no reconocida: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

echo "[AXIS Wayland/NVIDIA] WEBKIT_DISABLE_DMABUF_RENDERER=${WEBKIT_DISABLE_DMABUF_RENDERER}"
echo "[AXIS Wayland/NVIDIA] WEBKIT_DISABLE_COMPOSITING_MODE=${WEBKIT_DISABLE_COMPOSITING_MODE}"
echo "[AXIS Wayland/NVIDIA] GDK_BACKEND=${GDK_BACKEND}"

cd "$REPO_ROOT"

if [[ "$MODO" == "dev" ]]; then
  exec pnpm tauri dev
fi

if [[ -n "$BIN_EXPLICITO" ]]; then
  exec "$BIN_EXPLICITO"
fi

RELEASE_BIN="$REPO_ROOT/src-tauri/target/release/axis-desktop"
DEBUG_BIN="$REPO_ROOT/src-tauri/target/debug/axis-desktop"

if [[ -x "$RELEASE_BIN" ]]; then
  echo "[AXIS Wayland/NVIDIA] Ejecutando binario release: $RELEASE_BIN"
  exec "$RELEASE_BIN"
elif [[ "$MODO" == "bin" && -x "$DEBUG_BIN" ]]; then
  echo "[AXIS Wayland/NVIDIA] Ejecutando binario debug: $DEBUG_BIN"
  exec "$DEBUG_BIN"
elif [[ "$MODO" == "bin" ]]; then
  echo "Error: no existe binario compilado en '$RELEASE_BIN' ni '$DEBUG_BIN'. Ejecuta primero 'pnpm tauri build' o usa '--dev'." >&2
  exit 1
else
  echo "[AXIS Wayland/NVIDIA] Binario release no encontrado; iniciando modo desarrollo ('pnpm tauri dev')..."
  exec pnpm tauri dev
fi
