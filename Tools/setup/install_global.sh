#!/usr/bin/env bash
# ==============================================================================
# Tools/setup/install_global.sh
# Cài đặt tự động Orthex Bridge & Pstack Skills trên Linux / macOS / WSL / Git Bash
# ==============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_BIN="$HOME/.local/bin"
GLOBAL_SKILLS="$HOME/.gemini/config/skills"

echo "======================================================================"
echo "  CAI DAT TOAN CAU: ORTHEX BRIDGE & PSTACK MULTI-AGENT SKILLS (POSIX)"
echo "======================================================================"

mkdir -p "$LOCAL_BIN"
cp "$REPO_ROOT/Tools/pipeline/orthex_bridge.py" "$LOCAL_BIN/orthex_bridge.py"

cat << 'EOF' > "$LOCAL_BIN/orthex-bridge"
#!/bin/sh
python3 "$(dirname "$0")/orthex_bridge.py" "$@"
EOF
chmod +x "$LOCAL_BIN/orthex-bridge" "$LOCAL_BIN/orthex_bridge.py"
echo "[+] Da cai dat orthex-bridge vao $LOCAL_BIN"

mkdir -p "$GLOBAL_SKILLS/pstack" "$GLOBAL_SKILLS/pstack-michelin-rigor" "$GLOBAL_SKILLS/multi-agent-arena"
cp "$REPO_ROOT/.agents/skills/pstack/SKILL.md" "$GLOBAL_SKILLS/pstack/SKILL.md"
cp "$REPO_ROOT/.agents/skills/pstack-michelin-rigor/SKILL.md" "$GLOBAL_SKILLS/pstack-michelin-rigor/SKILL.md"
cp "$REPO_ROOT/.agents/skills/multi-agent-arena/SKILL.md" "$GLOBAL_SKILLS/multi-agent-arena/SKILL.md"
echo "[+] Da cai dat 3 Global Skills vao $GLOBAL_SKILLS"

echo "======================================================================"
echo "  [THANH CONG] Hay kiem tra PATH cua ban co chua $LOCAL_BIN chua!"
echo "  Chay thu: orthex-bridge --watch"
echo "======================================================================"
