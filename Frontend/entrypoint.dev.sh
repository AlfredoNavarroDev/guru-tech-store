#!/bin/sh
set -e
if [ ! -d "/app/node_modules/.bin" ]; then
  echo "Installing dependencies..."
  npm ci
fi
exec "$@"
