#!/bin/sh
set -e

# Start opencode server in the background
node opencode.js &

# Wait for the server to be ready (check if port 4096 is listening)
echo "Waiting for opencode server to start..."
for i in $(seq 1 30); do
  if nc -z localhost 4096 2>/dev/null; then
    echo "Opencode server is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Timeout waiting for opencode server"
    exit 1
  fi
  sleep 1
done

# Run the main application
exec node index.js

