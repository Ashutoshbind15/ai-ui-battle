# AI UI Comparator - Architecture Guide for LLMs

## Purpose

This project compares AI coding agents by running the same prompt across multiple LLM providers/models and displaying their generated UI side-by-side. Users can visually compare how different models (Claude, GPT, etc.) implement the same frontend task.

## High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    web-ui/      │────▶│    server/      │────▶│  opencode SDK   │
│  React Frontend │     │  Express API    │     │  (AI Agent)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (sessions,    │
                        │    batches)     │
                        └─────────────────┘
```

## Execution Modes

### 1. Local Server Mode (`server/`)

The primary execution mode. Runs opencode sessions directly on the host machine.

**Flow:**

1. API receives batch request with model configs + prompt
2. Creates batch record in DB
3. For each model: creates session, sets up project directory from template
4. Runs `opencode` SDK to execute the AI agent against the codebase
5. Spawns `pnpm dev` servers on assigned ports
6. Frontend iframes display each model's output side-by-side

**Key files:**

- `server/src/server.ts` - Express API, batch/session endpoints
- `server/src/utils.ts` - opencode SDK integration, dev server lifecycle
- `server/src/data/access/index.ts` - Database operations
- `server/tmp/` - Generated project directories (gitignored)

### 2. Container Mode (`images/coderunner/`)

Alternative isolated execution mode for production-like environments.

**Flow:**

1. Container downloads template from S3
2. Runs opencode server internally (port 4096)
3. Executes prompt against `/code` directory
4. Event listener streams progress
5. Dev server runs on exposed port

**Key files:**

- `images/coderunner/index.js` - Main execution logic
- `images/coderunner/events.js` - SSE event listener
- `images/coderunner/opencode.js` - Starts opencode server
- `images/coderunner/storage.js` - S3 template download

## Database Schema

```
batches (1) ──▶ (N) sessions (1) ──▶ (N) turns
```

### Tables

**batches** - Groups of comparison runs

- `id`, `name`, `prompt`, `createdAt`

**sessions** - Individual model execution

- `id`, `batchId`, `modelId`, `providerId`
- `status`: uninitialized → setup_pending → ready → prompting → completed/failed
- `devServerStatus`: stopped → starting → running → error
- `port`, `devServerPid`, `directory`, `opencodeSessionId`

**turns** - Prompt/response cycles within a session

- `id`, `sessionId`, `startTime`, `endTime`, `status`, `error`

## API Endpoints

### Batch Management

- `POST /batches` - Create batch with model configs and prompt
- `GET /batches` - List all batches
- `GET /batches/:id` - Get batch details with sessions

### Session Management

- `GET /sessions/:id` - Get session details
- `POST /sessions/:id/run` - Execute session (setup + prompt + dev server)
- `POST /sessions/:id/start-dev` - Start dev server only
- `POST /sessions/:id/stop-dev` - Stop dev server

### Utilities

- `GET /modelconfigs` - List available models from opencode
- `GET /ports/available` - Port allocation status

## Key Concepts

### Port Management

Sessions are assigned ports from a pool (default: 5173-5182). The server tracks:

- Which ports are in use
- Which session owns each port
- Dev server PIDs for cleanup

### Session Lifecycle

```
uninitialized ─▶ setup_pending ─▶ ready ─▶ prompting ─▶ completed
                      │                        │
                      ▼                        ▼
                 setup_failed                failed
```

### Dev Server Lifecycle

```
stopped ─▶ starting ─▶ running
               │
               ▼
             error
```

## Starter Templates

Located in `starters/clients/`. Currently:

- `react-ts-vite-tailwind-v4/` - React + TypeScript + Vite + Tailwind CSS v4

Setup script: `starters/scripts/vite-react-ts-tw.sh`

## Environment Variables

```bash
# Required
OPENCODE_API_KEY=       # opencode.ai API key
DATABASE_URL=           # PostgreSQL connection string

# Container mode only
S3_BUCKET_NAME=         # Template storage bucket
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
PROMPT=                 # The prompt to execute
MODEL_ID=               # e.g., "claude-sonnet-4-20250514"
TEMPLATE=               # e.g., "react-ts-vite-tailwind-v4"
```

## Docker Services

```yaml
postgres: # Database (port 5432)
redis: # Future: job queues (port 6379)
coderunner: # Container execution mode (port 5173)
```

## Frontend (`web-ui/`)

React app with:

- Batch creation UI (select models, enter prompt)
- Side-by-side iframe comparison view
- Session status monitoring
- Dev server controls

## Common Tasks

### Add a new model provider

1. Configure in opencode settings
2. Model appears automatically via `GET /modelconfigs`

### Add a new starter template

1. Create template in `starters/clients/`
2. Upload to S3 for container mode
3. Update `preDefinedTemplates` array

### Debug a failed session

1. Check `sessions.error` in DB
2. Check `turns` table for specific failure point
3. Look at `server/tmp/{provider}-{model}/` for generated code

## File Structure Summary

```
├── server/              # Express API + opencode orchestration
│   ├── src/
│   │   ├── server.ts    # API endpoints
│   │   ├── utils.ts     # opencode SDK, dev server mgmt
│   │   └── data/        # DB schema + access layer
│   └── tmp/             # Generated projects (gitignored)
├── images/coderunner/   # Docker container for isolated execution
├── starters/            # Project templates
├── web-ui/              # React frontend
└── docker-compose.yml   # Local dev services
```
