# NexaOS — Production Multi-Tenant SaaS Platform

A complete full-stack multi-tenant SaaS platform with role-based access control, real-time features, admin dashboard, and enterprise-grade architecture.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, TanStack Query, React Router v6, Zustand, Recharts |
| Styling | Tailwind CSS v3, dark mode via class strategy |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 via Prisma ORM (multi-schema tenant isolation) |
| Cache / Queue | Redis 7 + BullMQ |
| Real-time | Socket.io v4 (tenant-scoped rooms) |
| Auth | JWT (access 15m) + rotating refresh tokens (7d) stored in Redis |
| File storage | Cloudinary (direct upload + signed URLs) |
| Email | Resend |
| Container | Docker + Docker Compose |

---

## Architecture: Multi-Tenant Isolation

Each organization (tenant) gets:
- Its own **PostgreSQL schema** prefix (`tenant_acme`, `tenant_techstart`, …)
- A dedicated **Socket.io room** (`tenant:{id}`) — events never cross tenant boundaries
- A **Redis namespace** (`online:tenant:{id}`) for presence tracking
- **Cloudinary folder** (`nexaos/{tenantId}/…`) for file isolation
- JWT payload carries `tenantId` — validated on every request

---

## Role-Based Access Control

| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | Full platform access, cross-tenant |
| `ADMIN` | Full access within own tenant |
| `MEMBER` | Read + write within assigned projects |
| `VIEWER` | Read-only |

Guards are composed: `authenticate` → `requireRole('ADMIN')` → controller.

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Cloudinary account (free tier works)
- Resend account (free tier works)

### 1. Clone & configure

```bash
git clone <repo>
cd nexaos

cp backend/.env.example backend/.env
# Fill in JWT_SECRET, Cloudinary credentials, Resend API key
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Backend setup

```bash
cd backend
npm install
npm run db:migrate    # runs Prisma migrations
npm run db:seed       # seeds demo tenant + users
npm run dev           # starts on :4000 with hot reload
```

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env  # set VITE_API_URL=http://localhost:4000
npm run dev           # starts on :5173
```

### 5. Or — run everything with Docker

```bash
docker compose up --build
```

---

## Demo credentials (after seeding)

| Tenant slug | Email | Password | Role |
|---|---|---|---|
| `acme` | admin@acme.com | `password` | Admin |
| `acme` | member@acme.com | `password` | Member |
| `techstart` | admin@techstart.com | `password` | Admin |

---

## API Reference

### Auth
```
POST /api/auth/register   — Create tenant + admin user
POST /api/auth/login      — Returns access + refresh tokens
POST /api/auth/refresh    — Rotate refresh token
POST /api/auth/logout     — Revoke refresh token
```

### Projects (all require Auth + Tenant)
```
GET    /api/projects          — List (paginated, search, filter, sort)
POST   /api/projects          — Create
GET    /api/projects/:id      — Get single
PATCH  /api/projects/:id      — Update (Admin or project owner)
DELETE /api/projects/:id      — Delete (Admin only)
```

### Users
```
GET    /api/users             — List org members
POST   /api/users/invite      — Invite by email (Admin only)
PATCH  /api/users/:id         — Update role (Admin only)
DELETE /api/users/:id         — Remove (Admin only)
```

### Files
```
GET    /api/files             — List (search, filter by type/folder)
POST   /api/files             — Upload (multipart, proxied to Cloudinary)
POST   /api/files/signed-url  — Get signed URL for direct client upload
DELETE /api/files/:id         — Delete from Cloudinary + DB
```

### Audit logs
```
GET /api/audit                — List (filter by actor, action, date range)
```

---

## Real-Time Events (Socket.io)

Connect: `io(API_URL, { auth: { token: accessToken } })`

| Event | Direction | Payload |
|---|---|---|
| `project:created` | server → client | `{ project, actor, ts }` |
| `project:updated` | server → client | `{ project, actor, ts }` |
| `project:deleted` | server → client | `{ projectId, actor, ts }` |
| `file:uploaded` | server → client | `{ file, actor, ts }` |
| `file:deleted` | server → client | `{ fileId, actor, ts }` |
| `user:online` | server → client | `{ userId, ts }` |
| `user:offline` | server → client | `{ userId, ts }` |
| `presence:update` | server → client | `{ onlineCount, tenantId }` |
| `typing:start` | client → server | `{ projectId }` |
| `heartbeat` | client → server | — |

---

## Project Structure

```
nexaos/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Full DB schema with tenant isolation
│   └── src/
│       ├── index.ts               # Express + Socket.io server
│       ├── config/                # DB, Redis, logger, Cloudinary
│       ├── middleware/
│       │   ├── auth.ts            # JWT verify + RBAC guards
│       │   ├── tenant.ts          # Tenant resolver middleware
│       │   └── errorHandler.ts    # Global error handler
│       └── modules/
│           ├── auth/              # register, login, refresh, logout
│           ├── users/             # list, invite, update, remove
│           ├── projects/          # CRUD + search + pagination
│           ├── files/             # Cloudinary upload + management
│           ├── audit/             # Activity log service + middleware
│           └── realtime/          # Socket.io handlers + presence
└── frontend/
    └── src/
        ├── contexts/
        │   └── AuthContext.tsx    # Auth state + silent token refresh
        ├── lib/
        │   ├── api.ts             # Axios client + 401 interceptor
        │   └── socket.ts          # Socket.io singleton manager
        ├── hooks/
        │   └── useRealtime.ts     # Socket event hooks + feed + presence
        └── components/
            ├── ui/
            │   └── DataTable.tsx  # TanStack Table + pagination + sort
            └── files/
                └── FileUploader.tsx  # Dropzone + Cloudinary upload
```

---

## Production Checklist

- [ ] Set `NODE_ENV=production` and a strong `JWT_SECRET` (64+ random chars)
- [ ] Use `DATABASE_URL` with SSL (`?sslmode=require`)
- [ ] Configure Redis with AUTH password
- [ ] Set up Cloudinary upload presets with size/type restrictions
- [ ] Enable PostgreSQL row-level security for extra isolation
- [ ] Add rate limiting per tenant (separate from global limiter)
- [ ] Configure CORS to your production domain only
- [ ] Set up log aggregation (Winston → Datadog / Logtail / CloudWatch)
- [ ] Enable Prisma query logging in development, disable in production
- [ ] Set up database backups (pg_dump or managed backup)
- [ ] Add health check endpoint to load balancer
