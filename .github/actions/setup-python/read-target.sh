#!/usr/bin/env bash
set -euo pipefail
# Match the JavaScript stable target contract without requiring Node or Python.
target=$(cat "${1:-.python-version}")
target="${target#"${target%%[![:space:]]*}"}"
target="${target%"${target##*[![:space:]]}"}"
[[ $target =~ ^[1-9][0-9]*\.[0-9]+\.[0-9]+$ ]] || exit 1
IFS=. read -r -a components <<< "$target"
for part in "${components[@]}"; do
  # Compare decimal strings to avoid shell integer overflow and octal parsing.
  while [[ ${#part} -gt 1 && $part == 0* ]]; do part=${part:1}; done
  [[ ${#part} -lt 16 || ( ${#part} -eq 16 && ( $part == 9007199254740991 || $part < 9007199254740991 ) ) ]] || exit 1
done
printf 'version=>=%s\n' "$target" >> "$GITHUB_OUTPUT"
