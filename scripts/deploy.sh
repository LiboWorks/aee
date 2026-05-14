#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# AEE — Deploy / redeploy on EC2
# Usage:  ./scripts/deploy.sh
# Optional secret sources (set in the shell, instance env, or existing .env):
#   AEE_ENV_SECRET_ID=<Secrets Manager secret id containing JSON or dotenv>
#   AEE_ENV_SSM_PATH=</ssm/path/>   # Parameter Store path, keys use basename
# ──────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1"
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

is_alb_callback_uri() {
  local uri="$1"

  case "$uri" in
    */oauth2/idpresponse|*/oauth2/idpresponse\?*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

render_env_file() {
  local rendered_env
  local frontend_url
  local legacy_domain
  local legacy_redirect
  local legacy_logout
  local current_redirect
  local current_logout
  local canonical_redirect
  local canonical_logout
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

  frontend_url=$(read_env_value "$rendered_env" FRONTEND_URL)
  legacy_domain=$(read_env_value "$rendered_env" NEXT_PUBLIC_COGNITO_DOMAIN)
  legacy_redirect=$(read_env_value "$rendered_env" NEXT_PUBLIC_COGNITO_REDIRECT_URI)
  legacy_logout=$(read_env_value "$rendered_env" NEXT_PUBLIC_COGNITO_LOGOUT_URI)
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

  if [ -z "$(read_env_value "$rendered_env" COGNITO_HOSTED_UI_DOMAIN)" ] && [ -n "$legacy_domain" ]; then
    upsert_env_var "$rendered_env" COGNITO_HOSTED_UI_DOMAIN "$legacy_domain"
  fi

  if [ -z "$(read_env_value "$rendered_env" COGNITO_REDIRECT_URI)" ] && [ -n "$legacy_redirect" ]; then
    upsert_env_var "$rendered_env" COGNITO_REDIRECT_URI "$legacy_redirect"
  fi

  if [ -z "$(read_env_value "$rendered_env" COGNITO_LOGOUT_URI)" ] && [ -n "$legacy_logout" ]; then
    upsert_env_var "$rendered_env" COGNITO_LOGOUT_URI "$legacy_logout"
  fi

  if [ -n "$frontend_url" ]; then
    if [ -z "$(read_env_value "$rendered_env" COGNITO_REDIRECT_URI)" ]; then
      upsert_env_var "$rendered_env" COGNITO_REDIRECT_URI "${frontend_url%/}/api/auth/callback"
    fi
    if [ -z "$(read_env_value "$rendered_env" COGNITO_LOGOUT_URI)" ]; then
      upsert_env_var "$rendered_env" COGNITO_LOGOUT_URI "${frontend_url%/}/login"
    fi

    canonical_redirect="${frontend_url%/}/api/auth/callback"
    canonical_logout="${frontend_url%/}/login"
    current_redirect=$(read_env_value "$rendered_env" COGNITO_REDIRECT_URI)
    current_logout=$(read_env_value "$rendered_env" COGNITO_LOGOUT_URI)

    if [ -n "$current_redirect" ] && is_alb_callback_uri "$current_redirect"; then
      echo "==> Replacing legacy COGNITO_REDIRECT_URI with $canonical_redirect"
      upsert_env_var "$rendered_env" COGNITO_REDIRECT_URI "$canonical_redirect"
    fi

    if [ -n "$current_logout" ] && is_alb_callback_uri "$current_logout"; then
      echo "==> Replacing legacy COGNITO_LOGOUT_URI with $canonical_logout"
      upsert_env_var "$rendered_env" COGNITO_LOGOUT_URI "$canonical_logout"
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
  local cognito_user_pool_id
  local cognito_app_client_id
  local session_secret
  local hosted_ui_domain
  local hosted_ui_redirect_uri
  local hosted_ui_logout_uri
  local cognito_issuer_url

  use_rds=$(read_env_value .env USE_RDS)
  database_url=$(read_env_value .env DATABASE_URL)
  postgres_password=$(read_env_value .env POSTGRES_PASSWORD)
  frontend_url=$(read_env_value .env FRONTEND_URL)
  cognito_user_pool_id=$(read_env_value .env COGNITO_USER_POOL_ID)
  cognito_app_client_id=$(read_env_value .env COGNITO_APP_CLIENT_ID)
  session_secret=$(read_env_value .env SESSION_SECRET)
  hosted_ui_domain=$(read_env_value .env COGNITO_HOSTED_UI_DOMAIN)
  hosted_ui_redirect_uri=$(read_env_value .env COGNITO_REDIRECT_URI)
  hosted_ui_logout_uri=$(read_env_value .env COGNITO_LOGOUT_URI)
  cognito_issuer_url=$(read_env_value .env COGNITO_ISSUER_URL)

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

  if [ -z "$cognito_user_pool_id" ] || [[ "$cognito_user_pool_id" == *example* ]]; then
    echo "ERROR: COGNITO_USER_POOL_ID must be set to your Cognito User Pool ID."
    exit 1
  fi

  if [ -z "$cognito_app_client_id" ] || [[ "$cognito_app_client_id" == your-* ]]; then
    echo "ERROR: COGNITO_APP_CLIENT_ID must be set to your Cognito app client ID."
    exit 1
  fi

  if [ -z "$frontend_url" ] || [[ "$frontend_url" == http://localhost* ]]; then
    echo "ERROR: FRONTEND_URL must be set to the public app URL for EC2 deployment."
    exit 1
  fi

  if [ -z "$session_secret" ] || [[ "$session_secret" == replace-* ]]; then
    echo "ERROR: SESSION_SECRET must be set to a strong random secret."
    exit 1
  fi

  if [ -z "$hosted_ui_domain" ] || [[ "$hosted_ui_domain" != https://* ]]; then
    echo "ERROR: COGNITO_HOSTED_UI_DOMAIN must be set to your Cognito Hosted UI domain."
    exit 1
  fi

  if [ -z "$hosted_ui_redirect_uri" ] || [[ "$hosted_ui_redirect_uri" != http*://* ]]; then
    echo "ERROR: COGNITO_REDIRECT_URI must be set to your Hosted UI callback URL."
    exit 1
  fi

  if is_alb_callback_uri "$hosted_ui_redirect_uri"; then
    echo "ERROR: COGNITO_REDIRECT_URI cannot be /oauth2/idpresponse for this app. Use ${frontend_url%/}/api/auth/callback."
    exit 1
  fi

  if [ -z "$hosted_ui_logout_uri" ] || [[ "$hosted_ui_logout_uri" != http*://* ]]; then
    echo "ERROR: COGNITO_LOGOUT_URI must be set to your Hosted UI logout redirect URL."
    exit 1
  fi

  if is_alb_callback_uri "$hosted_ui_logout_uri"; then
    echo "ERROR: COGNITO_LOGOUT_URI cannot be /oauth2/idpresponse. Use ${frontend_url%/}/login."
    exit 1
  fi

  if [ -n "$cognito_issuer_url" ] && [[ "$cognito_issuer_url" != https://* ]]; then
    echo "ERROR: COGNITO_ISSUER_URL must start with https:// when provided."
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

echo "==> Deployment complete"
docker compose "${compose_files[@]}" ps
