#!/bin/zsh
cd "$(dirname "$0")"
if [ -d node_modules ]; then
  npm run dev
else
  print 'Run npm ci in this folder first, then open START.command again.'
  read '?Press Return to close.'
fi
