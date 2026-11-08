#!/usr/bin/env bash
# Launches one native Codex CLI run (worker, reviewer or permission probe) for Hax.
#
#   scripts/orchestration/codex-run.sh <worker|reviewer|probe-worker|probe-reviewer> <prompt-file> <run-name> [workdir]
#
# worker and probe-worker use workspace-write; reviewer and probe-reviewer use read-only. Every run
# passes the resolved model and effort, so personal ~/.codex/config.toml defaults never apply.
# Output lands in <workdir>/build-logs/<run-name>-{events.jsonl,completion.md,stderr.log,timing.txt}.
# A run name is never reused, so failed attempts stay preserved. Verify the model, effort and
# sandbox from the native session turn_context afterwards: a flag is not proof.
#
# CODEX_RUN_MODEL allows gpt-6-sol, gpt-6.1-sol or gpt-6-astra; CODEX_RUN_EFFORT allows low, medium
# or high. Defaults by role: workers gpt-6.1-sol high, reviewers gpt-6-astra medium (owner, 2026-11-07,
# same as Rowseta). Overrides are owner-directed and recorded in the timing log.
# CODEX_RUN_RESUME resumes a session UUID for worker only.
# CODEX_CLI_BIN and CODEX_NPM_PREFIX override executable discovery.
set -uo pipefail

usage() {
  printf 'usage: %s <worker|reviewer|probe-worker|probe-reviewer> <prompt-file> <run-name> [workdir]\n' "$0" >&2
  exit 64
}

[[ $# -ge 3 && $# -le 4 ]] || usage
role=$1
prompt=$2
run=$3
case "$role" in
  worker|probe-worker) sandbox=workspace-write; default_model=gpt-6.1-sol; default_effort=high ;;
  reviewer|probe-reviewer) sandbox=read-only; default_model=gpt-6-astra; default_effort=medium ;;
  *) printf 'role must be worker, reviewer, probe-worker or probe-reviewer, got: %s\n' "$role" >&2; exit 64 ;;
esac
model=${CODEX_RUN_MODEL:-$default_model}
effort=${CODEX_RUN_EFFORT:-$default_effort}
case "$model" in
  gpt-6-sol|gpt-6.1-sol|gpt-6-astra) ;;
  *) printf 'invalid CODEX_RUN_MODEL: %s\n' "$model" >&2; exit 64 ;;
esac
case "$effort" in
  low|medium|high) ;;
  *) printf 'invalid CODEX_RUN_EFFORT: %s\n' "$effort" >&2; exit 64 ;;
esac
if [[ ${CODEX_RUN_RESUME+x} ]]; then
  [[ "$role" == worker && "$CODEX_RUN_RESUME" =~ ^[[:xdigit:]]{8}-[[:xdigit:]]{4}-[[:xdigit:]]{4}-[[:xdigit:]]{4}-[[:xdigit:]]{12}$ ]] || {
    printf 'CODEX_RUN_RESUME requires worker role and a session UUID\n' >&2; exit 64;
  }
fi
[[ "$run" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { printf 'invalid run name: %s\n' "$run" >&2; exit 64; }
[[ -f "$prompt" ]] || { printf 'prompt file not found: %s\n' "$prompt" >&2; exit 66; }

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
workdir=${4:-$repo_root}
[[ -d "$workdir" ]] || { printf 'workdir not found: %s\n' "$workdir" >&2; exit 66; }
prompt=$(cd "$(dirname "$prompt")" && pwd)/$(basename "$prompt")
logs="$workdir/build-logs"
mkdir -p "$logs" || exit 73

to_unix() { if command -v cygpath >/dev/null 2>&1; then cygpath -u "$1"; else printf '%s' "$1"; fi; }
to_native() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

npm_prefix=$(to_unix "${CODEX_NPM_PREFIX:-C:/Program Files/nodejs}")
package_root="$npm_prefix/node_modules/@openai/codex"
native="$package_root/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe"
codex=$(to_unix "${CODEX_CLI_BIN:-$native}")
[[ -f "$codex" && -x "$codex" ]] || { printf 'Codex CLI native executable not found: %s\n' "$codex" >&2; exit 69; }

pwsh_dir=${CODEX_PWSH_DIR:-$(to_unix "${USERPROFILE:-$HOME}")/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell}
[[ -d "$pwsh_dir" ]] && export PATH="$pwsh_dir:$PATH"
export PATH="/c/Program Files/nodejs:$PATH"
export CODEX_MANAGED_PACKAGE_ROOT="$(to_native "$package_root")" CODEX_MANAGED_BY_NPM=1

timing="$logs/$run-timing.txt"
for artifact in timing.txt events.jsonl completion.md stderr.log; do
  [[ ! -e "$logs/$run-$artifact" ]] || { printf 'run name already used: %s\n' "$run" >&2; exit 73; }
done
( set -C; : >"$timing" ) 2>/dev/null || { printf 'run name already used: %s\n' "$run" >&2; exit 73; }

{
  date -u +"START %Y-%m-%dT%H:%M:%SZ"
  printf 'ROLE %s SANDBOX %s\nMODEL %s EFFORT %s\nCWD %s\nPROMPT %s\n' "$role" "$sandbox" "$model" "$effort" "$workdir" "$prompt"
  [[ -z ${CODEX_RUN_MODEL:-} && -z ${CODEX_RUN_EFFORT:-} ]] || printf 'OVERRIDE model=%s effort=%s\n' "${CODEX_RUN_MODEL:-}" "${CODEX_RUN_EFFORT:-}"
  if [[ ${CODEX_RUN_RESUME+x} ]]; then printf 'RESUME %s\n' "$CODEX_RUN_RESUME"; fi
  printf 'VERSION %s\n' "$("$codex" --version 2>&1)"
} >>"$timing"

cd "$workdir" || exit 73
if [[ ${CODEX_RUN_RESUME+x} ]]; then
  "$codex" exec resume "$CODEX_RUN_RESUME" - --model "$model" -c "model_reasoning_effort=\"$effort\"" \
    -c 'sandbox_mode="workspace-write"' --json -o "$logs/$run-completion.md" \
    <"$prompt" >"$logs/$run-events.jsonl" 2>"$logs/$run-stderr.log"
else
  "$codex" exec --sandbox "$sandbox" --model "$model" -c "model_reasoning_effort=\"$effort\"" --json \
    -o "$logs/$run-completion.md" - <"$prompt" >"$logs/$run-events.jsonl" 2>"$logs/$run-stderr.log"
fi
rc=$?
date -u +"FINISH %Y-%m-%dT%H:%M:%SZ EXIT $rc" >>"$timing"
exit "$rc"
