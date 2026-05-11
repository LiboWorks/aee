#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# AEE — EC2 first-time setup script
# Run on a fresh Ubuntu 22.04+ EC2 instance:
#   chmod +x scripts/ec2-setup.sh && sudo ./scripts/ec2-setup.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

install_aws_cli() {
  local arch
  local aws_arch
  local temp_dir

  if command -v aws >/dev/null 2>&1; then
    echo "==> AWS CLI already installed"
    aws --version
    return 0
  fi

  arch=$(dpkg --print-architecture)
  case "$arch" in
    amd64)
      aws_arch="x86_64"
      ;;
    arm64)
      aws_arch="aarch64"
      ;;
    *)
      echo "ERROR: unsupported architecture for AWS CLI install: $arch"
      exit 1
      ;;
  esac

  temp_dir=$(mktemp -d)
  trap 'rm -rf "$temp_dir"' RETURN

  echo "==> Installing AWS CLI v2"
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${aws_arch}.zip" -o "$temp_dir/awscliv2.zip"
  unzip -q "$temp_dir/awscliv2.zip" -d "$temp_dir"
  "$temp_dir/aws/install" --update
  aws --version
}

echo "==> Updating system packages"
apt-get update && apt-get upgrade -y

echo "==> Installing base tools"
apt-get install -y git jq unzip ca-certificates curl gnupg

install_aws_cli

echo "==> Installing Docker"
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
echo "    # Ensure the secret provides USE_RDS + DB mode values + Cognito env values"
echo "    ./scripts/deploy.sh"
