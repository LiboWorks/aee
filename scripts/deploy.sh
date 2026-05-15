#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# AEE — Deploy / redeploy on EC2
# Usage:  ./scripts/deploy.sh
# Optional secret sources (set in the shell, instance env, or existing .env):
#   AEE_ENV_SECRET_ID=<Secrets Manager secret id containing JSON or dotenv>
#   AEE_ENV_SSM_PATH=</ssm/path/>   # Parameter Store path, keys use basename
# Optional build-space controls:
#   AEE_PREBUILD_PRUNE=true|false      # default: true
#   AEE_AGGRESSIVE_PRUNE=true|false    # default: false (also prunes all cache/images/containers)
#   AEE_MIN_FREE_MB=<number>           # default: 6144
# ──────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1"
    exit 1
  fi
}

disk_free_mb() {
  df -Pk . | awk 'NR==2 {print int($4 / 1024)}'
}

print_disk_space() {
  local label="$1"
  local free_mb

  free_mb=$(disk_free_mb)
  echo "==> Free disk space ${label}: ${free_mb} MB"
}

validate_positive_integer() {
  local value="$1"
  local var_name="$2"

  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "ERROR: ${var_name} must be a non-negative integer."
    exit 1
  fi
}

run_prebuild_prune() {
  local prebuild_prune="${AEE_PREBUILD_PRUNE:-true}"
  local aggressive_prune="${AEE_AGGRESSIVE_PRUNE:-true}"

  case "$prebuild_prune" in
    true|false)
      ;;
    *)
      echo "ERROR: AEE_PREBUILD_PRUNE must be true or false."
      exit 1
      ;;
  esac

  case "$aggressive_prune" in
    true|false)
      ;;
    *)
      echo "ERROR: AEE_AGGRESSIVE_PRUNE must be true or false."
      exit 1
      ;;
  esac

  if [ "$prebuild_prune" != "true" ]; then
    echo "==> Skipping pre-build Docker cleanup (AEE_PREBUILD_PRUNE=false)"
    return
  fi

  echo "==> Running pre-build Docker cleanup"
  docker builder prune -f >/dev/null || true
  docker image prune -f >/dev/null || true

  if [ "$aggressive_prune" = "true" ]; then
    echo "==> Running aggressive Docker cleanup"
    docker builder prune -af >/dev/null || true
    docker image prune -af >/dev/null || true
    docker container prune -f >/dev/null || true
  fi
}

assert_min_disk_space() {
  local min_free_mb="${AEE_MIN_FREE_MB:-6144}"
  local free_mb

  validate_positive_integer "$min_free_mb" "AEE_MIN_FREE_MB"

  free_mb=$(disk_free_mb)
  validate_positive_integer "$free_mb" "disk_free_mb"

  if [ "$free_mb" -lt "$min_free_mb" ]; then
    echo "ERROR: only ${free_mb} MB free, but at least ${min_free_mb} MB is required before build."
    echo "Hint: set AEE_AGGRESSIVE_PRUNE=true or run:"
    echo "  docker builder prune -af"
    echo "  docker image prune -af"
    echo "  docker container prune -f"
    exit 1
  fi
}

read_env_value() {
  local file="$1"
  local key="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- || true
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp_file

  tmp_file=$(mktemp)
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    $0 ~ "^[[:space:]]*" key "=" {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) print key "=" value
    }
  ' "$file" > "$tmp_file"
  mv "$tmp_file" "$file"
}

overlay_env_file() {
  local source_file="$1"
  local target_file="$2"
  local line
  local key
  local value

  [ -f "$source_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*)
        continue
        ;;
    esac

    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      key=${line%%=*}
      value=${line#*=}
      upsert_env_var "$target_file" "$key" "$value"
    fi
  done < "$source_file"
}

overlay_secrets_manager_values() {
  local secret_id="$1"
  local target_file="$2"
  local temp_file
  local secret_payload

  require_command aws
  require_command jq

  echo "==> Loading deploy values from AWS Secrets Manager: $secret_id"
  secret_payload=$(aws secretsmanager get-secret-value --secret-id "$secret_id" --query SecretString --output text)

  if [ -z "$secret_payload" ] || [ "$secret_payload" = "None" ]; then
    echo "ERROR: Secrets Manager secret $secret_id does not contain SecretString content."
    exit 1
  fi

  temp_file=$(mktemp)
  if printf '%s' "$secret_payload" | jq -e . >/dev/null 2>&1; then
    printf '%s' "$secret_payload" | jq -r 'to_entries[] | select(.value != null) | "\(.key)=\(.value | tostring)"' > "$temp_file"
  else
    printf '%s\n' "$secret_payload" > "$temp_file"
  fi

  overlay_env_file "$temp_file" "$target_file"
  rm -f "$temp_file"
}

overlay_ssm_values() {
  local ssm_path="$1"
  local target_file="$2"
  local temp_file

  require_command aws
  require_command jq

  echo "==> Loading deploy values from AWS Systems Manager Parameter Store: $ssm_path"
  temp_file=$(mktemp)
  aws ssm get-parameters-by-path \
    --path "$ssm_path" \
    --with-decryption \
    --recursive \
    --output json | jq -r '.Parameters[]? | "\(.Name | split("/")[-1])=\(.Value)"' > "$temp_file"

  overlay_env_file "$temp_file" "$target_file"
  rm -f "$temp_file"
}

render_env_file() {
  local rendered_env
  local use_rds
  local postgres_user
  local postgres_db

  if [ ! -f .env.example ]; then
    echo "ERROR: .env.example is missing."
    exit 1
  fi

  rendered_env=$(mktemp)
  cp .env.example "$rendered_env"

  if [ -f .env ]; then
    echo "==> Preserving existing .env values where no newer source overrides them"
    overlay_env_file .env "$rendered_env"
  fi

  if [ -n "${AEE_ENV_SECRET_ID:-}" ]; then
    overlay_secrets_manager_values "$AEE_ENV_SECRET_ID" "$rendered_env"
  fi

  if [ -n "${AEE_ENV_SSM_PATH:-}" ]; then
    overlay_ssm_values "$AEE_ENV_SSM_PATH" "$rendered_env"
  fi

  use_rds=$(read_env_value "$rendered_env" USE_RDS)

  if [ -z "$use_rds" ]; then
    use_rds="true"
    upsert_env_var "$rendered_env" USE_RDS "$use_rds"
  fi

  case "$use_rds" in
    true|false)
      ;;
    *)
      echo "ERROR: USE_RDS must be either true or false."
      exit 1
      ;;
  esac

  if [ "$use_rds" = "false" ]; then
    postgres_user=$(read_env_value "$rendered_env" POSTGRES_USER)
    postgres_db=$(read_env_value "$rendered_env" POSTGRES_DB)

    if [ -z "$postgres_user" ]; then
      upsert_env_var "$rendered_env" POSTGRES_USER "aee_user"
    fi

    if [ -z "$postgres_db" ]; then
      upsert_env_var "$rendered_env" POSTGRES_DB "aee_db"
    fi
  fi

  if [ "$(read_env_value "$rendered_env" NEXT_PUBLIC_API_URL)" = "http://localhost:4000" ]; then
    upsert_env_var "$rendered_env" NEXT_PUBLIC_API_URL ""
  fi

  mv "$rendered_env" .env
}

validate_rendered_env() {
  local use_rds
  local database_url
  local postgres_password
  local frontend_url

  use_rds=$(read_env_value .env USE_RDS)
  database_url=$(read_env_value .env DATABASE_URL)
  postgres_password=$(read_env_value .env POSTGRES_PASSWORD)
  frontend_url=$(read_env_value .env FRONTEND_URL)

  if [ -z "$use_rds" ]; then
    use_rds="true"
  fi

  case "$use_rds" in
    true|false)
      ;;
    *)
      echo "ERROR: USE_RDS must be either true or false."
      exit 1
      ;;
  esac

  if [ "$use_rds" = "true" ]; then
    if [ -z "$database_url" ] || [[ "$database_url" == *change-me* ]] || [[ "$database_url" == *"@localhost"* ]] || [[ "$database_url" == *"@postgres:"* ]]; then
      echo "ERROR: DATABASE_URL must point to your RDS PostgreSQL instance when USE_RDS=true."
      exit 1
    fi
  else
    if [ -z "$postgres_password" ] || [[ "$postgres_password" == change-me* ]]; then
      echo "ERROR: POSTGRES_PASSWORD must be set when USE_RDS=false."
      exit 1
    fi
  fi

  if [ -z "$frontend_url" ] || [[ "$frontend_url" == http://localhost* ]]; then
    echo "ERROR: FRONTEND_URL must be set to the public app URL for EC2 deployment."
    exit 1
  fi
}

if [ -f .env ]; then
  AEE_ENV_SECRET_ID=${AEE_ENV_SECRET_ID:-$(read_env_value .env AEE_ENV_SECRET_ID)}
  AEE_ENV_SSM_PATH=${AEE_ENV_SSM_PATH:-$(read_env_value .env AEE_ENV_SSM_PATH)}
  AWS_REGION=${AWS_REGION:-$(read_env_value .env AWS_REGION)}
  AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-$(read_env_value .env AWS_DEFAULT_REGION)}
  export AEE_ENV_SECRET_ID AEE_ENV_SSM_PATH AWS_REGION AWS_DEFAULT_REGION
fi

echo "==> Rendering .env from .env.example and AWS-managed overrides"
render_env_file
validate_rendered_env

require_command docker
print_disk_space "before cleanup"
run_prebuild_prune
print_disk_space "after cleanup"
assert_min_disk_space

USE_RDS_VALUE=$(read_env_value .env USE_RDS)
if [ -z "$USE_RDS_VALUE" ]; then
  USE_RDS_VALUE="true"
fi

compose_files=(-f docker-compose.prod.yml)
if [ "$USE_RDS_VALUE" = "false" ]; then
  compose_files+=(-f docker-compose.localdb.yml)
  echo "==> USE_RDS=false: using local postgres sidecar"
else
  echo "==> USE_RDS=true: using external RDS"
fi

echo "==> Building and starting containers"
if ! docker compose "${compose_files[@]}" up -d --build --remove-orphans; then
  echo "==> Deployment failed. Recent backend logs:"
  docker compose "${compose_files[@]}" logs --tail=200 backend || true
  exit 1
fi

backend_container_status=$(docker compose "${compose_files[@]}" ps --format json backend 2>/dev/null || true)
if printf '%s' "$backend_container_status" | grep -qi 'unhealthy'; then
  echo "==> Backend is unhealthy. Recent backend logs:"
  docker compose "${compose_files[@]}" logs --tail=200 backend || true
  exit 1
fi

echo "==> Cleaning up old images"
docker image prune -f
docker builder prune -f >/dev/null || true

echo "==> Deployment complete"
docker compose "${compose_files[@]}" ps
