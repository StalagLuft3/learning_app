#!/usr/bin/env bash
# wait-for-it.sh -- A script to wait for a service to be available
# Source: https://github.com/vishnubob/wait-for-it

set -e

HOST=$(echo $1 | cut -d: -f1)
PORT=$(echo $1 | cut -d: -f2)
shift

TIMEOUT=60
STRICT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --timeout=*)
      TIMEOUT="${1#*=}"
      shift
      ;;
    --strict)
      STRICT="--strict"
      shift
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

for i in $(seq 1 $TIMEOUT); do
  if nc -z "$HOST" "$PORT"; then
    echo "Service $HOST:$PORT is available!"
    exec "$@"
    exit 0
  fi
  echo "Waiting for $HOST:$PORT... ($i/$TIMEOUT)"
  sleep 1
done

echo "Timeout after $TIMEOUT seconds waiting for $HOST:$PORT"
if [ "$STRICT" = "--strict" ]; then
  exit 1
fi
exec "$@"
