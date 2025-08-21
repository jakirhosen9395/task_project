#!/usr/bin/env bash
set -e

# --- config you can change ---
IMAGE="cartup:v1"
NAME="cartup"
HOST_PORT=8080
CONTAINER_PORT=80
# -----------------------------

echo "[1] Update and install curl"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl

echo "[2] Install Docker (stable)"
curl -fsSL https://get.docker.com | sudo sh

echo "[3] Enable services"
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
sudo systemctl restart docker.service || true

echo "[4] Add current user to 'docker' group (takes effect after re-login)"
sudo groupadd -f docker
sudo usermod -aG docker "$USER"

echo "[5] Build image"
test -f Dockerfile || { echo "Dockerfile not found in $(pwd)"; exit 1; }
sudo docker build -t "$IMAGE" .

echo "[6] Run container"
sudo docker rm -f "$NAME" >/dev/null 2>&1 || true
sudo docker run -d --name "$NAME" -p "${HOST_PORT}:${CONTAINER_PORT}" "$IMAGE"

echo "Done."
echo "If you want to run docker without sudo, log out and back in."
