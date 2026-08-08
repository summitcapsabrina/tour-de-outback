#!/usr/bin/env bash
# SEO-GOD daily runner — macOS / Linux (and Git Bash, where `claude` resolves on PATH).
#
# Run it FROM THE PROJECT ROOT: the directory that holds seo-god.json. The
# scheduler entry created by references/schedule.md sets that working directory.
#
# It probes the local OpenSEO container, hands the run to Claude Code
# (`/seo-god daily`), and ALWAYS leaves a run marker at .seo-god/last-run.json —
# the file SKILL.md's missed-run self-check reads:
#   {"ts":"<UTC ISO 8601>","ok":true|false,"notes":"<short>"}
# The marker is this script's alone; references/act.md never writes it.
#
# Requires: bash, the `claude` CLI. `curl` and `node` are optional — they serve
# only the readiness probe (node reads openseo.url out of seo-god.json), so a
# machine without them still runs the loop and says so in the marker notes.
#
# --skill-dir <path> points at THIS skill's folder. A headless session can only
# read files inside its working directories, and the skill lives outside the
# project, so without --add-dir on that path `claude -p` can read none of
# references/*.md and the loop runs on SKILL.md's summary alone. The installer
# passes the real path into the scheduler entry; the default below covers a
# hand-run. Defaults to ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/seo-god.
#
# SEO_GOD_DRY_RUN=1 prints what would happen, writes an ok:true "dry-run"
# marker, and exits 0 — no network call, no Claude Code session.
#
# There is no per-run timeout here on purpose: the OS scheduler owns the
# execution time limit (references/schedule.md sets it).
set -euo pipefail

DRY="${SEO_GOD_DRY_RUN:-0}"
MARKER=".seo-god/last-run.json"
STEP="startup"
SUFFIX=""
SKILL_NOTE=""

SKILL_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/seo-god"
while [ $# -gt 0 ]; do
  case "$1" in
    --skill-dir) SKILL_DIR="${2:-}"; shift 2 ;;
    --skill-dir=*) SKILL_DIR="${1#--skill-dir=}"; shift ;;
    *) echo "warn: ignoring unknown argument: $1" >&2; shift ;;
  esac
done

# The permission grant for an unattended turn. acceptEdits covers Write/Edit and
# a fixed filesystem-command set and NOTHING else — every curl (the whole OpenSEO
# MCP surface) and every git call is denied without this. Read-only git only:
# act.md and audit.md forbid committing, so add/commit/push must never appear.
ALLOWED_TOOLS='Bash(curl:*),Bash(curl.exe:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(git check-ignore:*),Bash(git rev-parse:*),WebSearch'

mkdir -p .seo-god
# The snapshot directory is deliberately NOT pre-created here: measure.md
# section 5.1 resolves it per run and falls back to seo/snapshots/ when dist/ is
# gitignored, so an empty dist/seo/snapshots would point at the wrong history.

note() {
  printf '{"ts":"%s","ok":%s,"notes":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" > "$MARKER"
}
# Both notes matter and neither may overwrite the other: an unreachable OpenSEO
# and unreadable phase files are different degradations of the same run.
notes_all() {
  if [ -n "$SUFFIX" ] && [ -n "$SKILL_NOTE" ]; then printf '%s; %s' "$SUFFIX" "$SKILL_NOTE"
  elif [ -n "$SUFFIX" ]; then printf '%s' "$SUFFIX"
  else printf '%s' "$SKILL_NOTE"
  fi
}
# Any unhandled failure — including a non-zero exit from claude — lands here.
trap 'note false "failed during $STEP (line $LINENO)"' ERR
# A scheduler that hits its execution-time limit kills the run mid-flight. Without
# this the marker would still hold the PREVIOUS run's ok:true and SKILL.md's
# self-check would never see the miss. Clearing ERR on the way out keeps this note
# from being overwritten by the killed command's own failure.
trap 'note false "interrupted during $STEP"; trap - ERR; exit 143' INT TERM
# Deliberate stops clear the trap first so the intended note is the one kept.
die() { trap - ERR; note false "$1"; exit 1; }

STEP="reading seo-god.json"
if [ ! -f seo-god.json ]; then
  echo "error: seo-god.json not found in $(pwd) — run this from the project root" >&2
  die "seo-god.json not found in the working directory"
fi

OPENSEO_URL=""
if command -v node >/dev/null 2>&1; then
  # The try/catch keeps node's status 0 for malformed JSON or a missing key: an
  # unreadable URL costs the probe, never the run.
  OPENSEO_URL="$(node -e 'try{const s=JSON.parse(require("fs").readFileSync("seo-god.json","utf8"));process.stdout.write(String((s.openseo&&s.openseo.url)||""))}catch(e){}')" || OPENSEO_URL=""
  [ -n "$OPENSEO_URL" ] || SUFFIX="openseo.url unreadable, probe skipped"
else
  SUFFIX="node not found, probe skipped"
fi
OPENSEO_URL="${OPENSEO_URL%/}"

# --add-dir only when the directory exists (claude validates it at startup and a
# missing path is a hard startup failure) and only when it is not already inside
# the project root, where the session can read it anyway.
STEP="resolving skill dir"
ADD_DIR_ARGS=()
SKILL_DIR_ABS=""
if [ -d "$SKILL_DIR" ]; then
  SKILL_DIR_ABS="$(cd "$SKILL_DIR" && pwd)"
  PROJECT_ABS="$(pwd)"
  if [ "${SKILL_DIR_ABS#"$PROJECT_ABS"/}" = "$SKILL_DIR_ABS" ] && [ "$SKILL_DIR_ABS" != "$PROJECT_ABS" ]; then
    ADD_DIR_ARGS=(--add-dir "$SKILL_DIR_ABS")
  fi
else
  SKILL_NOTE="skill dir not found, phase files unreadable"
  echo "warn: skill dir not found at $SKILL_DIR — the run cannot read references/*.md" >&2
fi

if [ "$DRY" = "1" ]; then
  echo "DRY: cwd $(pwd)"
  echo "DRY: would GET ${OPENSEO_URL:-<unknown>}/api/health (max 120s, non-fatal)"
  echo "DRY: skill dir ${SKILL_DIR_ABS:-$SKILL_DIR}"
  # The dry run proves the phase files are READABLE, not merely that the CLI
  # exists: an unreadable act.md is the failure that silently guts the loop.
  if [ -r "${SKILL_DIR_ABS:-$SKILL_DIR}/references/act.md" ]; then
    echo "DRY: references/act.md readable — yes"
  else
    echo "DRY: references/act.md readable — NO (the daily loop would run blind)"
  fi
  if [ ${#ADD_DIR_ARGS[@]} -gt 0 ]; then
    echo "DRY: would pass --add-dir \"$SKILL_DIR_ABS\""
  else
    echo "DRY: would pass no --add-dir (skill dir missing, or inside the project)"
  fi
  echo "DRY: would pass --allowedTools $ALLOWED_TOOLS"
  echo 'DRY: would run claude -p "/seo-god daily" --permission-mode acceptEdits --max-turns 30'
  if command -v claude >/dev/null 2>&1; then
    echo "DRY: claude CLI found"
  else
    echo "DRY: claude CLI NOT on PATH — a real run would stop here"
  fi
  [ -z "$SUFFIX" ] || echo "DRY: note — $SUFFIX"
  [ -z "$SKILL_NOTE" ] || echo "DRY: note — $SKILL_NOTE"
  echo "DRY: would write $MARKER"
  note true "dry-run"
  exit 0
fi

STEP="claude CLI check"
if ! command -v claude >/dev/null 2>&1; then
  echo "error: claude CLI not found on PATH" >&2
  die "claude CLI not found"
fi

# Readiness probe, not a cron trigger. OpenSEO has NO cron/refresh endpoint to
# hit: its only scheduled work is the Cloudflare Workers `scheduled()` export in
# src/server.ts, driven by the "*/15 * * * *" cron in wrangler.jsonc — which is
# unreachable over HTTP and absent from the self-hosted Docker mode this skill
# uses (docker-entrypoint.sh ends in `vite preview`, a plain Node server). Their
# own preflight says so: "Rank-tracking schedules do not run in Docker mode"
# (src/lib/selfhost-preflight.ts). The agentic step below drives every crawl,
# rank and GSC read itself over MCP, so all this step buys is knowing the
# container answered first. /api/health is unauthenticated by design
# (src/routes/api/health.ts — the Docker HEALTHCHECK probes it).
STEP="OpenSEO health probe"
if [ -n "$OPENSEO_URL" ]; then
  if ! command -v curl >/dev/null 2>&1; then
    SUFFIX="curl not found, probe skipped"
    echo "warn: curl not found — skipping the OpenSEO readiness probe" >&2
  elif ! curl -fsS -m 120 -o /dev/null "$OPENSEO_URL/api/health"; then
    SUFFIX="openseo unreachable"
    echo "warn: OpenSEO health probe failed — continuing (act.md degrades)" >&2
  fi
fi

STEP="claude -p /seo-god daily"
# MSYS2_ARG_CONV_EXCL is the Git Bash trap: MSYS rewrites any argument that looks
# like an absolute POSIX path before handing it to a native .exe, so the prompt
# would reach claude.exe as "C:/Program Files/Git/seo-god daily" — a real 50-turn
# acceptEdits session on a garbage prompt, ending in an ok:true marker. Scoped to
# this one prefix, and ignored outright by macOS and Linux shells.
MSYS2_ARG_CONV_EXCL='/seo-god' claude -p "/seo-god daily" \
  --permission-mode acceptEdits \
  --allowedTools "$ALLOWED_TOOLS" \
  ${ADD_DIR_ARGS[@]+"${ADD_DIR_ARGS[@]}"} \
  --max-turns 30

NOTES="$(notes_all)"
if [ -n "$NOTES" ]; then
  note true "completed ($NOTES)"
else
  note true "completed"
fi

# --- seo-god telegram digest (references/power-ups.md section 3.3) — safe to delete ---
# Reads TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / TELEGRAM_THREAD_ID from .seo-god/secrets.env at
# run time and sends nothing when token or chat id is absent. EVERY assignment, command
# substitution and command below is guarded on purpose: this script runs under `set -e` with an
# ERR trap that rewrites the run marker, so one unguarded failure here would record a run that
# actually SUCCEEDED as ok:false. TELEGRAM_THREAD_ID is a project-specific extension (not in the
# skill's stock block) that posts into a specific Telegram forum topic instead of the chat's
# general stream — the Tour de Outback group's "TdO SEO" topic.
sg_secret() { sed -n "s/^$1=//p" .seo-god/secrets.env 2>/dev/null | tail -n1; }
TG_TOKEN="$(sg_secret TELEGRAM_BOT_TOKEN)" || TG_TOKEN=""
TG_CHAT="$(sg_secret TELEGRAM_CHAT_ID)" || TG_CHAT=""
TG_THREAD="$(sg_secret TELEGRAM_THREAD_ID)" || TG_THREAD=""
if [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ] && command -v curl >/dev/null 2>&1; then
  TG_DAY="$(date +%Y-%m-%d)" || TG_DAY="unknown date"
  TG_BODY="$(cat "$MARKER" 2>/dev/null || echo 'no run marker')"
  for TG_DIR in dist/seo/readouts seo/readouts; do
    if [ -f "$TG_DIR/$TG_DAY.md" ]; then
      TG_BODY="$TG_BODY
$(head -c 3000 "$TG_DIR/$TG_DAY.md" || true)"
      break
    fi
  done
  if [ -n "$TG_THREAD" ]; then
    curl -fsS -m 20 -o /dev/null -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \
      --data-urlencode "chat_id=$TG_CHAT" --data-urlencode "message_thread_id=$TG_THREAD" \
      --data-urlencode "text=seo-god $TG_DAY
$TG_BODY" || true
  else
    curl -fsS -m 20 -o /dev/null -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \
      --data-urlencode "chat_id=$TG_CHAT" \
      --data-urlencode "text=seo-god $TG_DAY
$TG_BODY" || true
  fi
fi
# --- end seo-god telegram digest ---
