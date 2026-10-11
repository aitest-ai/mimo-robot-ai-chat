#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash .devcontainer/start-ollama.sh
if curl -fsS --max-time 2 http://127.0.0.1:3000/ >/dev/null 2>&1; then
  echo 'Mimo is already running.'
  exit 0
fi
nohup env PORT=3000 HOST='0.0.0.0' OLLAMA_URL='http://127.0.0.1:11434' node server.mjs </dev/null >/tmp/mimo-chat.log 2>&1 &
for i in $(seq 1 15); do
  if curl -fsS --max-time 2 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    echo 'Mimo chat is running. Open the forwarded port 3000 in Codespaces.'
    exit 0
  fi
  sleep 1
done
echo 'Mimo chat did not start; inspect /tmp/mimo-chat.log.' >&2
exit 1
