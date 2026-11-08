#!/usr/bin/env bash
# Read-only wait before a worker proof command. Waits while a Hax or Rowseta gate holds the
# machine, and through weekday quiet hours (Mon to Fri 8:45 AM to 5:15 PM Toronto), then
# runs the command. Unknown Toronto time refuses with exit 78.
# GATE_QUIET_HOURS_OVERRIDE=1 is the recorded owner override.
#
#   bash scripts/orchestration/wait-gate-idle.sh <command...>
set -euo pipefail
[[ $# -gt 0 ]] || { printf 'usage: wait-gate-idle.sh <command...>\n' >&2; exit 64; }

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/quiet-hours.sh"
lock_base=${LOCALAPPDATA:-$HOME}
export PATH="/c/Program Files/nodejs:$PATH"
export VITEST_MAX_WORKERS=${VITEST_MAX_WORKERS:-2}
next_note=0
while :; do
  if [[ -e "$lock_base/hax/gate.lock" || -e "$lock_base/bentobits/gate.lock" ]]; then
    if [[ $SECONDS -ge $next_note ]]; then printf 'wait-gate-idle: a gate is running; waiting\n' >&2; next_note=$((SECONDS + 30)); fi
    sleep 2
    continue
  fi
  if quiet_hours_check wait-gate-idle worker; then
    [[ $QUIET_HOURS_LINE != 'QUIET HOURS OVERRIDE:'* ]] || printf '%s\n' "$QUIET_HOURS_LINE" >&2
    break
  fi
  [[ $QUIET_HOURS_STATE == quiet ]] || exit "$QUIET_HOURS_EXIT"
  if [[ $SECONDS -ge $next_note ]]; then printf 'wait-gate-idle: no tests until 5:15 PM Toronto\n' >&2; next_note=$((SECONDS + 600)); fi
  sleep 60
done
exec "$@"
