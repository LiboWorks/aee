#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# AEE — EC2 first-time setup script
# Run on a fresh Ubuntu 22.04+ EC2 instance:
#   chmod +x scripts/ec2-setup.sh && sudo ./scripts/ec2-setup.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

echo "==> Updating system packages"
apt-get update && apt-get upgrade -y

echo "==> Installing Git"
apt-get install -y git awscli jq

echo "==> Installing Docker"
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Adding ubuntu user to docker group"
usermod -aG docker ubuntu

echo "==> Enabling Docker on boot"
systemctl enable docker
systemctl start docker

echo "==> Done! Log out and back in, then:"
echo "    cd /home/ubuntu/aee"
echo "    export AEE_ENV_SECRET_ID=<your-secrets-manager-secret-id>   # optional"
echo "    export AEE_ENV_SSM_PATH=</your/ssm/path/>                   # optional"
echo "    ./scripts/deploy.sh"
