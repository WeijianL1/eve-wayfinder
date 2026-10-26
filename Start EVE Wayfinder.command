#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo '请先安装 Node.js 22.18+，或在已经能运行 npm 的终端执行 npm start。'
  read -r '?按回车退出。'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci
fi
npm start
