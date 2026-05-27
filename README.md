# AEE Intelligence OS — Amazon Seller Intelligence Platform

AEE is an autonomous market-research operating system for Amazon sellers, built for Shenzhen small and medium teams (3-20 people).

The platform is designed to feel like a persistent AI co-pilot, not a chatbot wrapper:

- AI agents continuously research opportunities and risks
- Investigation workflows execute in multiple steps with evidence
- Monitoring runs continuously and pushes live alerts
- Recommendations are explainable and source-backed

The previous product-input -> strategy -> asset -> experiment workflow still exists under legacy pages, but the primary experience now starts in the AI Command Center.

```
                                                                Realtime Intelligence Loop
┌───────────────────────────┐       ws://.../ws/intelligence      ┌───────────────────────────┐
│ Frontend Intelligence UI  │◀────────────────────────────────────▶│ Intelligence Runtime      │
│ - Command Center          │                                       │ - Multi-agent orchestration
│ - Investigation Workspace │                                       │ - Investigation state      │
│ - Monitoring / Alerts     │──────────────────────────────────────▶│ - Activity + alerts feed   │
└──────────────┬────────────┘            /api/intelligence/*       └──────────────┬────────────┘
                             │                                                              │
                             │                                                              │
                             ▼                                                              ▼
         Existing domain modules                                           LLM provider stack
 (products/strategy/assets/experiments)                    (Bedrock default, plus DeepSeek/OpenAI/local)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, Recharts, Framer Motion |
| Backend | NestJS, TypeScript, ws (WebSocket server) |
| Database | PostgreSQL, Prisma ORM, Amazon RDS (production) |
| AI Runtime | AWS Bedrock Runtime by default, with DeepSeek/OpenAI/local GGUF fallbacks |
| Agent Orchestration | AgentCore-ready runtime abstraction (`AGENTCORE_MODE=mock|bedrock`) |
| Automation | Playwright (gated by feature flag) |
| Auth | Amazon Cognito via ALB authenticate-cognito rules |

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

Open **http://localhost:3000** and sign in. Authenticated users are redirected to **/dashboard/command-center**.

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

## Dashboard Pages (Intelligence OS)

| Route | Purpose |
|------|---------|
| `/dashboard/command-center` | Live AI command center with agent feed, emerging opportunities, danger zone, alerts, and quick actions |
| `/dashboard/opportunity-workspace` | Multi-step investigation workspace with controls, live workflow, reasoning, and evidence |
| `/dashboard/product-intelligence` | AI-generated product intelligence report with executive summary, reasoning, risk, and strategy |
| `/dashboard/competition-survival` | Seller concentration, market heatmap, review domination, PPC/price-war pressure |
| `/dashboard/small-team-opportunities` | Opportunities filtered for lean 3-20 person teams |
| `/dashboard/trend-intelligence` | TikTok/Google/Reddit/Amazon trend acceleration and stage signals |
| `/dashboard/live-monitoring` | Continuous monitoring center with realtime alerts |
| `/dashboard/competitor-intelligence` | Competitor move tracking (new listings, price changes, review growth, etc.) |
| `/dashboard/ai-research` | Investigation-oriented Q&A workflow (not plain chat) |
| `/dashboard/evidence-explorer` | Source/evidence catalog with comparison snapshots |
| `/dashboard/workspace-settings` | Team profile, agent cadence, and watchlist thresholds |

Legacy routes remain available:

- `/dashboard/new`
- `/dashboard/history`
- `/dashboard/products/[id]/strategy`
- `/dashboard/products/[id]/execution`
- `/dashboard/products/[id]/experiment`

## Realtime + Agent Runtime

- WebSocket endpoint: `/ws/intelligence`
- Realtime event types:
    - `connection.ready`
    - `activity.update`
    - `monitoring.alert`
    - `investigation.progress`
    - `investigation.completed`
- Intelligence investigation state is currently in-memory in the backend runtime service.
- Agent execution is abstracted behind an AgentCore-ready adapter:
    - `AGENTCORE_MODE=mock` (default)
    - `AGENTCORE_MODE=bedrock` (runs Bedrock-backed structured prompting path)

## API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/auth/login` | ALB auth entrypoint; redirects to app after successful ALB auth |
| GET | `/api/auth/logout` | Clear ALB auth cookies and redirect to login page |
| GET | `/api/auth/me` | Return current user mapped from ALB identity headers |

### Core Product / Legacy Workflow APIs

| Method | Endpoint | Description |
|--------|---------|-------------|
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

### Intelligence Platform APIs

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/intelligence/command-center` | Command center snapshot (feed, opportunities, alerts, summaries) |
| POST | `/api/intelligence/investigations` | Start multi-agent investigation |
| GET | `/api/intelligence/investigations/:id` | Get investigation state/progress |
| GET | `/api/intelligence/reports/:investigationId` | Get product intelligence report |
| GET | `/api/intelligence/competition-survival` | Competition and survivability snapshot |
| GET | `/api/intelligence/small-team-opportunities` | Small-team-focused opportunity list |
| GET | `/api/intelligence/trend-intelligence` | Trend intelligence snapshot |
| GET | `/api/intelligence/live-monitoring` | Monitoring overview and current alerts |
| GET | `/api/intelligence/competitor-intelligence` | Competitor movement intelligence |
| POST | `/api/intelligence/research-workspace` | Run investigation-oriented AI research query |
| GET | `/api/intelligence/evidence-explorer` | Evidence and source explorer snapshot |
| GET | `/api/intelligence/workspace-settings` | Workspace/team settings snapshot |

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
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── auth/
│       ├── product/
│       ├── strategy/
│       ├── llm/
│       ├── asset/
│       ├── execution/
│       ├── automation/
│       ├── integrations/
│       ├── experiment/
│       ├── analytics/
│       ├── feature-flag/
│       ├── common/
│       ├── prisma/
│       └── intelligence/
│           ├── intelligence.controller.ts
│           ├── intelligence.service.ts
│           ├── intelligence-realtime.service.ts
│           ├── intelligence.dto.ts
│           ├── intelligence.types.ts
│           ├── intelligence.constants.ts
│           ├── intelligence.utils.ts
│           └── agentcore/
│               └── agentcore.adapter.ts
└── frontend/
        └── src/
                ├── app/
                │   ├── login/
                │   ├── register/
                │   └── dashboard/
                │       ├── command-center/
                │       ├── opportunity-workspace/
                │       ├── product-intelligence/
                │       ├── competition-survival/
                │       ├── small-team-opportunities/
                │       ├── trend-intelligence/
                │       ├── live-monitoring/
                │       ├── competitor-intelligence/
                │       ├── ai-research/
                │       ├── evidence-explorer/
                │       ├── workspace-settings/
                │       ├── new/
                │       ├── history/
                │       └── products/[id]/
                ├── components/
                │   └── intelligence/
                └── lib/
                        ├── api.ts
                        ├── auth.tsx
                        ├── intelligence.ts
                        ├── use-intelligence-realtime.ts
                        └── types.ts
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
| `AGENTCORE_MODE` | No | mock | Intelligence runtime mode: `mock` or `bedrock` |
| `AWS_REGION` | No | — | AWS region for Bedrock Runtime |
| `BEDROCK_MODEL_ID` | No | anthropic.claude-3-haiku-20240307-v1:0 | Bedrock model ID when Bedrock is active |
| `BEDROCK_INFERENCE_PROFILE_ID` | Yes when `LLM_PROVIDER=bedrock` | — | Bedrock inference profile ID/ARN used for Bedrock invocations |
| `OPENAI_API_KEY` | No | — | OpenAI API key fallback |
| `DEEPSEEK_API_KEY` | No | — | DeepSeek API key fallback |
| `LLM_MODEL` | No | deepseek-chat | Model name for DeepSeek/OpenAI when those providers are active |
| `ERROR_LOG_S3_BUCKET` | No | — | If set, backend uploads captured exceptions to this S3 bucket |
| `ERROR_LOG_S3_PREFIX` | No | errors | S3 key prefix used for exception logs |
| `ERROR_LOG_S3_REGION` | No | `AWS_REGION` | Optional region override for the S3 logging bucket |
| `BACKEND_PORT` | No | 4000 | Backend server port |
| `FRONTEND_URL` | No | http://localhost:3000 | CORS origin |
| `THROTTLE_TTL` | No | 60 | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | No | 100 | Max requests per window |
| `NEXT_PUBLIC_API_URL` | No | empty in prod | Frontend API base URL override; empty means same-origin `/api/*` |

Auth note: Cognito app client, callback URL, and sign-out URL are configured on ALB listener rules, not via backend runtime env vars.
