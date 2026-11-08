#!/usr/bin/env bash
# Toronto clock and admission policy. Sourcing this library only defines functions.
quiet_hours_now() {
  local value day date_part script
  if [[ -n ${GATE_QUIET_HOURS_NOW+x} ]]; then
    value=$GATE_QUIET_HOURS_NOW
    [[ $value =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$ ]] || return 1
    date_part=${value%T*}
    day=$(date -d "$date_part" +%u) || return 1
    printf '%s %s %s\n' "$day" "$date_part" "${value#*T}"
    return
  fi
  script=$(cygpath -w "$(dirname "${BASH_SOURCE[0]}")/toronto-now.ps1") || return 1
  value=$(PSExecutionPolicyPreference=RemoteSigned powershell.exe -NoProfile -NonInteractive \
    -File "$script") || return 1
  value=${value//$'\r'/}
  [[ $value =~ ^[1-7]\ [0-9]{4}-[0-9]{2}-[0-9]{2}\ ([01][0-9]|2[0-3]):[0-5][0-9]$ ]] || return 1
  printf '%s\n' "$value"
}

quiet_hours_state() {
  local value
  value=$(quiet_hours_now) || return 1
  quiet_hours_classify "$value"
}

quiet_hours_classify() {
  local day date_part time
  read -r day date_part time <<< "$1"
  if [[ $day -le 5 && $time < 17:15 && ! $time < 08:45 ]]; then
    printf 'quiet\n'
  elif [[ $day -le 5 && $time < 08:45 && ! $time < 07:45 ]]; then
    printf 'pre\n'
  else
    printf 'open\n'
  fi
}

quiet_hours_message() {
  local tool=$1 value=${2:-Toronto time unavailable}
  printf '%s: refused: no tests Monday to Friday 8:45 AM to 5:15 PM Toronto (owner, 2026-11-07), and no gate or train start in the 60 minutes before 8:45 AM; Toronto time now %s. Owner override: GATE_QUIET_HOURS_OVERRIDE=1.\n' "$tool" "$value" >&2
}

# Sets the status constant and a recordable line in the caller, without printing on success.
# Workers admit the pre-window; gates and trains admit only open time.
quiet_hours_check() {
  local tool=$1 mode=${2:-start} state value
  QUIET_HOURS_EXIT=78
  QUIET_HOURS_LINE=''
  QUIET_HOURS_STATE=unknown
  if [[ -n ${GATE_QUIET_HOURS_OVERRIDE:-} && $GATE_QUIET_HOURS_OVERRIDE != 1 ]]; then
    printf '%s: refused: invalid GATE_QUIET_HOURS_OVERRIDE; only 1 is allowed\n' "$tool" >&2
    return "$QUIET_HOURS_EXIT"
  fi
  value=$(quiet_hours_now) || value='Toronto time unavailable'
  if [[ ${GATE_QUIET_HOURS_OVERRIDE:-} == 1 ]]; then
    QUIET_HOURS_LINE="QUIET HOURS OVERRIDE: owner override used at $value"
    return 0
  fi
  if [[ $value == 'Toronto time unavailable' ]]; then
    quiet_hours_message "$tool" "$value"
    return "$QUIET_HOURS_EXIT"
  fi
  # Classify the same snapshot used in the log, without another clock call.
  state=$(quiet_hours_classify "$value") || return "$QUIET_HOURS_EXIT"
  QUIET_HOURS_STATE=$state
  if [[ $state == quiet || ( $state == pre && $mode == start ) ]]; then
    [[ $mode == worker ]] || quiet_hours_message "$tool" "$value"
    return "$QUIET_HOURS_EXIT"
  fi
  QUIET_HOURS_LINE="QUIET HOURS: open $value"
}
