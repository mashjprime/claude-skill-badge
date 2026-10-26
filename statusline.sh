#!/usr/bin/env bash
# Claude Code status line: [skill badge] model effort | dir (branch*) | ctx tokens | weekly limit | $cost
# The badge comes from the skill-badge plugin; without it the rest still works.
# Presenter mode (touch <claude dir>/skill-badge/presenter) hides path, cost and limit.
in=$(cat)
dir_claude="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
model=$(jq -r '.model.display_name // "?"' <<<"$in")
dir=$(jq -r '.workspace.current_dir // .cwd // empty' <<<"$in")
pct=$(jq -r '.context_window.used_percentage // empty | floor' <<<"$in" 2>/dev/null)
tok=$(jq -r '.context_window.total_input_tokens // empty' <<<"$in" 2>/dev/null)
win=$(jq -r '.context_window.context_window_size // empty' <<<"$in" 2>/dev/null)
k() { awk -v n="$1" 'BEGIN { if (n >= 1000000) { s = sprintf("%.1f", n/1000000); sub(/\.0$/, "", s); printf "%sM", s } else printf "%dk", (n+500)/1000 }'; }
effort=$(jq -r '.effort.level // empty' <<<"$in")
week=$(jq -r '.rate_limits.seven_day.used_percentage // empty | floor' <<<"$in" 2>/dev/null)
sid=$(jq -r '.session_id // empty' <<<"$in")
cost=$(jq -r '.cost.total_cost_usd // empty' <<<"$in")
presenter=""; [ -e "$dir_claude/skill-badge/presenter" ] && presenter=1

branch=""
if [ -n "$dir" ] && b=$(git -C "$dir" branch --show-current 2>/dev/null) && [ -n "$b" ]; then
  [ -n "$(git -C "$dir" status --porcelain 2>/dev/null | head -1)" ] && b="$b*"
  branch=" ($b)"
fi
if [ -n "$presenter" ]; then
  where="${dir##*/}"
  eff="${effort:+ $effort}"
else
  where="${dir/#$HOME/\~}"
  eff="${effort:+ \033[2m$effort\033[0m}"
fi
out="\033[36m$model\033[0m$eff | $where\033[33m$branch\033[0m"

if [ -n "$tok" ]; then
  # green under 50% full, yellow under 80%, red beyond
  c=32; [ "${pct:-0}" -ge 50 ] && c=33; [ "${pct:-0}" -ge 80 ] && c=31
  out="$out | \033[${c}m$(k "$tok")${win:+ / $(k "$win")}\033[0m"
fi
if [ -n "$week" ] && [ -z "$presenter" ]; then
  c=32; [ "$week" -ge 50 ] && c=33; [ "$week" -ge 80 ] && c=31
  out="$out | wk \033[${c}m${week}%\033[0m"
fi
[ -n "$cost" ] && [ -z "$presenter" ] && out="$out | \$$(printf '%.2f' "$cost")"

# Skill badge, written per session by the skill-badge plugin
if [ -n "$sid" ] && IFS='|' read -r parent skill phase rounds questions 2>/dev/null < "$dir_claude/skill-badge/$sid" && [ -n "$skill" ]; then
  case "$skill:$phase" in
    tdd:red)      badge="\033[1;97;41m RED \033[0m" ;;
    tdd:green)    badge="\033[1;30;42m GREEN \033[0m" ;;
    tdd:refactor) badge="\033[1;97;44m REFACTOR \033[0m" ;;
    tdd:*)        badge="\033[1;30;47m TDD \033[0m" ;;
    grill*)       badge="\033[1;97;45m GRILL R${rounds:-0} · ${questions:-0}Q \033[0m" ;;
    *)            badge="\033[1;35m⚡ $skill\033[0m" ;;
  esac
  [ -n "$parent" ] && badge="\033[1;35m$parent ›\033[0m $badge"
  out="$badge $out"
fi
printf '%b' "$out"
