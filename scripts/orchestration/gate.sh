#!/usr/bin/env bash
# The Hax full gate. Coordinators run it on a frozen candidate; workers never do.
#
#   bash scripts/orchestration/gate.sh [--e2e] [--label <name>]
#
# Takes the machine gate lock (one heavy job at a time, shared in spirit with Rowseta: it also
# waits while Rowseta's gate lock is held), refuses to start in weekday quiet hours, then runs:
#   1. npm run lint
#   2. npm run typecheck
#   3. npm test            (unit tests, content reading level, repository text rules)
#   4. npm run build
#   5. with --e2e: the full Playwright suite on Chromium and Edge at 1366x768 and 1920x1080
# Each command's result is written to build-logs/gate-<label>-<time>.log. Exit is non-zero on any failure.
set -uo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
e2e=0
label=gate
while [[ $# -gt 0 ]]; do
  case "$1" in
    --e2e) e2e=1; shift ;;
    --label) label=$2; shift 2 ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; exit 64 ;;
  esac
done
[[ "$label" =~ ^[A-Za-z0-9._-]+$ ]] || { printf 'invalid label\n' >&2; exit 64; }

source "$repo_root/scripts/orchestration/quiet-hours.sh"
if ! quiet_hours_check gate start; then exit "$QUIET_HOURS_EXIT"; fi

lock_base=${LOCALAPPDATA:-$HOME}
lock="$lock_base/hax/gate.lock"
rowseta_lock="$lock_base/bentobits/gate.lock"
mkdir -p "$lock_base/hax"
while [[ -e "$rowseta_lock" ]]; do
  printf 'gate: waiting for the Rowseta gate to finish\n' >&2
  sleep 15
done
until mkdir "$lock" 2>/dev/null; do
  printf 'gate: waiting for another Hax gate (%s)\n' "$(cat "$lock/holder" 2>/dev/null || echo unknown)" >&2
  sleep 10
done
printf '%s %s\n' "$repo_root" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$lock/holder"
trap 'rm -rf "$lock"' EXIT

cd "$repo_root" || exit 73
export PATH="/c/Program Files/nodejs:$PATH"
mkdir -p build-logs
log="build-logs/gate-$label-$(date -u +%Y%m%dT%H%M%SZ).log"
{
  printf 'GATE %s\nHEAD %s\nTREE %s\n%s\n' "$label" "$(git rev-parse HEAD 2>/dev/null)" "$(git status --porcelain | wc -l) changed paths" "$QUIET_HOURS_LINE"
} >"$log"

status=0
run_step() {
  local name=$1; shift
  local start=$SECONDS
  if "$@" >>"$log.$name.out" 2>&1; then
    printf 'PASS %-10s %4ss  %s\n' "$name" $((SECONDS - start)) "$*" | tee -a "$log"
  else
    status=1
    printf 'FAIL %-10s %4ss  %s  (see %s)\n' "$name" $((SECONDS - start)) "$*" "$log.$name.out" | tee -a "$log"
    grep -m 5 -iE 'error|fail|✗|×' "$log.$name.out" | sed 's/^/    /' | tee -a "$log"
  fi
}

run_step lint npm run lint
run_step types npm run typecheck
run_step unit npm test
run_step build npm run build
if [[ $e2e == 1 && $status == 0 ]]; then
  run_step e2e npx playwright test
fi
[[ $e2e == 1 ]] || printf 'NOT RUN e2e (pass --e2e)\n' | tee -a "$log"
printf 'RESULT %s\nLOG %s\n' "$([[ $status == 0 ]] && echo PASS || echo FAIL)" "$log" | tee -a "$log"
exit "$status"
