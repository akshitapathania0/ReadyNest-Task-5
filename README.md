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

## Role-Based Access Control

| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | Full platform access, cross-tenant |
| `ADMIN` | Full access within own tenant |
| `MEMBER` | Read + write within assigned projects |
| `VIEWER` | Read-only |

## Demo credentials (after seeding)

| Tenant slug | Email | Password | Role |
|---|---|---|---|
| `acme` | admin@acme.com | `password` | Admin |
| `acme` | member@acme.com | `password` | Member |
| `techstart` | admin@techstart.com | `password` | Admin |

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

