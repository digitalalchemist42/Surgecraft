#!/bin/sh
# Restore the SurgeCraft build workspace from this repo.
# The build scripts use fixed paths (/home/claude/sc_data, /home/claude/app, /home/claude/upd106),
# so the files go back to exactly those places. Run from the repo root:  sh source/restore.sh
# Set ROOT to restore somewhere else for inspection (the scripts will still read/write /home/claude/...).
set -e
ROOT="${ROOT:-/home/claude}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/sc_data" "$ROOT/app" "$ROOT/upd106"
cp -r "$REPO/source/sc_data/." "$ROOT/sc_data/"
cp -r "$REPO/source/app/." "$ROOT/app/"
cp -r "$REPO/source/upd106/." "$ROOT/upd106/"
# Card, unit, mini, race and deployment art: the published site's img/ folder is the same set the build uses.
mkdir -p "$ROOT/app/img"
cp -r "$REPO/img/." "$ROOT/app/img/"
mv "$ROOT/app/extract_report.json" "$ROOT/app/img/extract_report.json"
echo "Restored to $ROOT/{sc_data,app,upd106}"
