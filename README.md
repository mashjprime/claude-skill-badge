# claude-skill-badge

A Claude Code status line that shows what [Matt Pocock's skills](https://github.com/mattpocock/skills) are doing, live:

```
 RED  Opus 5.5 medium | ~/shop (part-2*) | 69k / 1M | wk 4% | $0.82
implement ›  GREEN  Opus 5.5 ...
grill-with-docs ›  GRILL R3 · 14Q  Opus 5.5 ...
```

- **`tdd`**: ` TDD ` → ` RED ` when a test run fails → ` GREEN ` when it passes → ` REFACTOR ` on the next edit.
- **Grilling** (`grill-me`, `grill-with-docs`, `grilling`): rounds asked and questions so far.
- **Skill chains**: when one skill loads another in the same turn (`/implement` → `tdd`), the badge shows both.
- Any other skill shows its name. The rest of the line is context tokens (green / yellow / red as it fills), your weekly limit and session cost.

## Install

Needs a recent Claude Code (`claude update`), `bash` and `jq`.

1. The status line, from a shell:

   ```
   curl -fsSL https://raw.githubusercontent.com/mashjprime/claude-skill-badge/main/install.sh | bash
   ```

   If you already have a status line it stops and tells you; add `-s -- --force` after `bash` to replace it (your `settings.json` is backed up).

2. The plugin that feeds the badge, at the prompt of a Claude Code session:

   ```
   /plugin install skill-badge --marketplace mashjprime/claude-skill-badge
   ```

   Answer `y` to add the marketplace, then pick a scope. From a shell instead: `claude plugin install skill-badge --marketplace mashjprime/claude-skill-badge`.

The status line works without the plugin; you just don't get the badge.

## Presenter mode

`touch ~/.claude/skill-badge/presenter` hides your path, weekly limit and cost and un-dims the text, for screen sharing. `rm` it to go back.

## How it works

The plugin hooks `skill.prompt`, `tool.call` and `turn.complete` and writes one line per session to `~/.claude/skill-badge/<session id>`; `statusline.sh` reads it using the `session_id` Claude Code passes in. A test run is any Bash command mentioning `test`, `pytest`, `vitest`, `jest`, `cargo test`, ... — a failing one is RED.

MIT licensed.
