#!/usr/bin/env bash

set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but not installed." >&2
  exit 1
fi

APP_NAME="${1:-react-ts-tailwind-app}"

if [ -d "$APP_NAME" ]; then
  echo "Error: directory '$APP_NAME' already exists." >&2
  exit 1
fi

TEMPLATE_DIR="../starters/clients/react-ts-vite-tailwind-v4"
echo "Scaffolding Vite + React + TS + Tailwind v4 + app in '$APP_NAME' from '$TEMPLATE_DIR' template..."

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: template directory '$TEMPLATE_DIR' does not exist." >&2
  exit 1
fi

# Copy existing Vite + React + TS template non-interactively
cp -R "$TEMPLATE_DIR" "$APP_NAME"

# Remove lockfile and node_modules so the new app can install cleanly
rm -rf "$APP_NAME/node_modules"
rm -f "$APP_NAME/bun.lock" "$APP_NAME/package-lock.json" "$APP_NAME/yarn.lock" "$APP_NAME/pnpm-lock.yaml"

cd "$APP_NAME"

# Install base dependencies with npm
npm install

echo "Done. Project created in '$APP_NAME'."