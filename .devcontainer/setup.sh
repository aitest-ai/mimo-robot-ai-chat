#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
MODELDIR="$(pwd)/.ollama-models"
mkdir -p "$MODELDIR"
if ! command -v ollama >/dev/null 2>&1; then
  echo 'Installing Ollama into the Codespace...'
  curl -fsSL https://ollama.com/install.sh -o /tmp/mimo-ollama-install.sh
  sh /tmp/mimo-ollama-install.sh
fi
bash .devcontainer/start-ollama.sh
model="${MIMO_MODEL:-qwen3:0.6b}"
if ! OLLAMA_MODELS="$MODELDIR" ollama list | awk 'NR>1 {print $1}' | grep -Fxq "$model"; then
  echo "Pulling demo model: $model"
  OLLAMA_MODELS="$MODELDIR" ollama pull "$model"
else
  echo "Model already present: $model"
fi
echo 'Ollama is ready. Mimo chat will start automatically on port 3000.'
