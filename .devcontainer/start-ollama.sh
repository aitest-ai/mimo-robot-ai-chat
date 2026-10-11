#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
MODELDIR="$(pwd)/.ollama-models"
mkdir -p "$MODELDIR"
if curl -fsS --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo 'Ollama is already running.'
  exit 0
fi
if ! command -v ollama >/dev/null 2>&1; then
  echo 'Ollama is not installed. Run bash .devcontainer/setup.sh first.' >&2
  exit 1
fi
nohup env OLLAMA_HOST='127.0.0.1:11434' OLLAMA_MODELS="$MODELDIR" ollama serve </dev/null >/tmp/mimo-ollama.log 2>&1 &
for i in $(seq 1 35); do
  if curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo 'Ollama server is running.'
    exit 0
  fi
  sleep 1
done
echo 'Ollama server could not start, inspect /tmp/mimo-ollama.log.' >&2
exit 1
