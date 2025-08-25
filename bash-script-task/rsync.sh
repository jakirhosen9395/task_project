#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
KEY="/home/tn-99646/Downloads/Maintenance/office.pem"
SOURCE="/home/tn-99646/Desktop/DATA/"
DEST_USER="ubuntu"
DEST_IP="34.205.125.90"
DEST_PATH="/home/ubuntu/data/"
# --------------

echo "Copying $SOURCE to $DEST_USER@$DEST_IP:$DEST_PATH ..."

rsync -avz \
  -e "ssh -i $KEY" \
  --progress \
  "$SOURCE" \
  "${DEST_USER}@${DEST_IP}:${DEST_PATH}"

echo "Done."

