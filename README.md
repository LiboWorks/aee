# AEE — AI Experiment Engine for Amazon Sellers

An end-to-end SaaS platform that discovers product opportunities, generates strategy, creates listing assets, executes deployments, and runs ad experiments — all powered by AI.

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Input Layer │───▶│ Strategy Engine   │───▶│ Asset Generator   │
│  (URL+Budget)│    │ (LLM Multi-Step) │    │ (Listing Copy)    │
└──────────────┘    └──────────────────┘    └──────────────────┘
                                                     │
                    ┌──────────────────┐              │
                    │  Feedback Loop   │◀─────────────┤
                    │  (PostgreSQL)    │    ┌──────────▼────────┐
                    └──────────────────┘    │ Execution Layer   │
                             ▲             │ (Manual/Auto/API) │
                             │             └──────────┬────────┘
                    ┌────────┴─────────┐              │
                    │Experiment Runner │◀─────────────┘
                    │(Simulate/Track)  │
                    └──────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, Recharts |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma ORM, Amazon RDS (production) |
| LLM | AWS Bedrock Runtime by default, with DeepSeek, OpenAI, and local GGUF fallbacks |
| Automation | Playwright (gated by feature flag) |
| Auth | Amazon Cognito User Pool + Hosted UI |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL) — on macOS, [Colima](https://github.com/abiosoft/colima) is recommended
- npm

### 1. Clone & Setup Environment

```bash
cp .env.example .env
# Edit .env with your values (Bedrock uses the standard AWS SDK credential chain,
# auth is enforced by ALB authenticate-cognito rules,
# and USE_RDS controls external RDS vs local postgres sidecar)
cp .env backend/.env
```

### 2. Start Database

```bash
# macOS with Colima (start the Docker runtime first)
colima start
# If behind a proxy, restart Colima with proxy env vars:
# colima stop && colima start \
#   --env HTTP_PROXY=socks5h://<host-gateway-ip>:1080 \
#   --env HTTPS_PROXY=socks5h://<host-gateway-ip>:1080 \
#   --env ALL_PROXY=socks5h://<host-gateway-ip>:1080

# Start PostgreSQL
docker-compose up -d
```

### 3. Install Dependencies & Setup Database

```bash
# Backend
cd backend
npm install
npx prisma db push
npx prisma db seed
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 4. Run

```bash
# Terminal 1: Backend (port 4000)
cd backend && npm run start:dev

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev:clean
```

Open **http://localhost:3000** — register an account and start.

When running locally without ALB in front of the backend, protected `/api/*` routes return `401` unless your reverse proxy injects ALB OIDC headers.

For production auth, configure ALB `authenticate-cognito` on protected routes.

For production on EC2 with ALB (no nginx container):

- Route `/*` to the frontend target (port `3000`)
- Route `/api/*` to the backend target (port `4000`)
- Keep `NEXT_PUBLIC_API_URL` empty so frontend calls same-origin `/api/*`
- Restrict EC2 security groups so only the ALB can access ports `3000` and `4000`
- In the Cognito app client used by ALB, add callback URL `https://<your-domain>/oauth2/idpresponse`
- Use `onUnauthenticatedRequest=authenticate` for API routes that require login

Database mode switch:

- `USE_RDS=true`: use external PostgreSQL from `DATABASE_URL`
- `USE_RDS=false`: deploys a local postgres sidecar (`docker-compose.localdb.yml`) and backend uses it automatically

### 5. Inspect Database

```bash
# Prisma Studio — visual UI at http://localhost:5555
cd backend && npx prisma studio

# Or connect directly via psql
docker exec -it aee-postgres psql -U postgres -d aee
```

## User Flow

1. **Input** — Paste an Amazon product URL, set budget and risk level
2. **Strategy** — AI analyzes viability, generates differentiation + pricing + execution plan
3. **Assets** — AI generates optimized listing (title, bullets, description, image prompts)
4. **Execution** — Review, approve, then execute (download manually, auto-fill via Playwright, or mock SP-API)
5. **Experiment** — Run a simulated ad campaign, view daily metrics, get AI evaluation
6. **History** — Review all past products and their outcomes

## API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/auth/login` | ALB auth entrypoint; redirects to app after successful ALB auth |
| GET | `/api/auth/logout` | Clear ALB auth cookies and redirect to login page |
| GET | `/api/auth/me` | Return current user mapped from ALB identity headers |
| POST | `/api/products` | Create product from URL |
| GET | `/api/products` | List user products |
| GET | `/api/products/:id` | Get product detail |
| POST | `/api/strategies` | Generate AI strategy |
| GET | `/api/strategies/:id` | Get strategy |
| POST | `/api/assets` | Generate listing assets |
| GET | `/api/assets/:id` | Get asset |
| PATCH | `/api/assets/:id/approve` | Approve asset |
| POST | `/api/executions` | Create execution |
| POST | `/api/executions/:id/confirm` | Confirm & execute |
| PATCH | `/api/executions/:id/rollback` | Rollback |
| POST | `/api/experiments` | Create experiment |
| GET | `/api/experiments/:id` | Get experiment |
| GET | `/api/experiments/:id/results` | Get daily results |
| POST | `/api/experiments/:id/evaluate` | AI evaluation |
| GET | `/api/analytics/history` | Paginated history |
| GET | `/api/analytics/product/:id/timeline` | Product lifecycle |
| GET | `/api/feature-flags` | List feature flags |
| PATCH | `/api/feature-flags/:name` | Toggle flag |

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `automation.enabled` | false | Enable Playwright browser automation |
| `sp-api.enabled` | false | Enable Amazon SP-API integration |
| `experiment.live` | false | Enable live experiment tracking |
| `llm.mock` | false | Use mock LLM responses |

## Project Structure

```
aee/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (9 models)
│   │   └── seed.ts            # Feature flag seed data
│   └── src/
│       ├── main.ts            # NestJS bootstrap
│       ├── app.module.ts      # Root module
│       ├── auth/              # ALB identity header auth + user sync
│       ├── product/           # Product ingestion + web scraper
│       ├── strategy/          # Multi-step LLM strategy generation
│       ├── llm/               # Provider adapters + prompt templates
│       ├── asset/             # Listing asset generation
│       ├── execution/         # 3-phase execution (manual/auto/API)
│       ├── automation/        # Playwright scripts
│       ├── integrations/      # Amazon SP-API mock
│       ├── experiment/        # Experiment simulation + evaluation
│       ├── analytics/         # History + timeline queries
│       ├── feature-flag/      # Feature flag management
│       ├── common/            # Action log service
│       └── prisma/            # Prisma service (global)
└── frontend/
    └── src/
        ├── app/
        │   ├── login/         # Auth pages
        │   ├── register/
        │   └── dashboard/
        │       ├── new/       # Product input form
        │       ├── history/   # History & analytics
        │       └── products/[id]/
        │           ├── strategy/   # Strategy results
        │           ├── execution/  # Execution panel
        │           └── experiment/ # Experiment dashboard
        └── lib/
            ├── api.ts         # API client
            ├── auth.tsx       # Auth context
            └── types.ts       # TypeScript types
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USE_RDS` | No | false | `true` uses external RDS, `false` uses local postgres sidecar |
| `POSTGRES_USER` | No | aee_user | Local postgres username when `USE_RDS=false` |
| `POSTGRES_PASSWORD` | Yes when `USE_RDS=false` | — | Local postgres password |
| `POSTGRES_DB` | No | aee_db | Local postgres database name when `USE_RDS=false` |
| `DATABASE_URL` | Yes when `USE_RDS=true` | — | PostgreSQL connection string for RDS |
| `LLM_PROVIDER` | No | bedrock | Explicit provider override: `bedrock`, `deepseek`, `openai`, `local`, or `auto` |
| `AWS_REGION` | No | — | AWS region for Bedrock Runtime |
| `BEDROCK_MODEL_ID` | No | anthropic.claude-3-haiku-20240307-v1:0 | Bedrock model ID when Bedrock is active |
| `OPENAI_API_KEY` | No | — | OpenAI API key fallback |
| `DEEPSEEK_API_KEY` | No | — | DeepSeek API key fallback |
| `LLM_MODEL` | No | deepseek-chat | Model name for DeepSeek/OpenAI when those providers are active |
| `BACKEND_PORT` | No | 4000 | Backend server port |
| `FRONTEND_URL` | No | http://localhost:3000 | CORS origin |
| `THROTTLE_TTL` | No | 60 | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | No | 100 | Max requests per window |

Auth note: Cognito app client, callback URL, and sign-out URL are configured on ALB listener rules, not via backend runtime env vars.
