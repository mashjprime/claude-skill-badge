#!/usr/bin/env bash
# Installs the skill-badge status line: copies statusline.sh into your Claude
# config dir and points settings.json's statusLine at it. Needs jq.
# Usage: curl -fsSL https://raw.githubusercontent.com/mashjprime/claude-skill-badge/main/install.sh | bash
#        add --force to replace a status line you already have (the old settings are backed up).
set -euo pipefail
dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
settings="$dir/settings.json"
target="$dir/skill-badge-statusline.sh"
src="https://raw.githubusercontent.com/mashjprime/claude-skill-badge/main/statusline.sh"
force=""; [ "${1:-}" = "--force" ] && force=1

command -v jq >/dev/null || { echo "skill-badge: jq is required (brew install jq / apt install jq)" >&2; exit 1; }
mkdir -p "$dir"
[ -f "$settings" ] || echo '{}' > "$settings"

current=$(jq -r '.statusLine.command // empty' "$settings")
if [ -n "$current" ] && [ "$current" != "bash $target" ] && [ -z "$force" ]; then
  echo "skill-badge: you already have a status line ($current)."
  echo "Re-run with --force to replace it; settings.json is backed up first."
  exit 1
fi

here=$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)
if [ -f "$here/statusline.sh" ]; then cp "$here/statusline.sh" "$target"
else curl -fsSL "$src" -o "$target"; fi

cp "$settings" "$settings.bak.$(date +%s)"
tmp=$(mktemp)
jq --arg cmd "bash $target" '.statusLine = { type: "command", command: $cmd }' "$settings" > "$tmp" && mv "$tmp" "$settings"
echo "skill-badge: status line installed at $target"
echo "Now in Claude Code: /plugin install skill-badge --marketplace mashjprime/claude-skill-badge"
