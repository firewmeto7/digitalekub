# Digital Ekub

Foundation monorepo for the Digital Ekub platform. The workspace contains a NestJS API, Next.js 14 web app, shared TypeScript types, and PostgreSQL/Redis development services.

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- Docker Compose

## Local setup

```sh
cp .env.example .env
pnpm install
docker compose up -d
pnpm --filter api prisma migrate dev --name init
pnpm --filter api prisma db seed
```

Run the API and web app in separate terminals:

```sh
pnpm dev:api
pnpm dev:web
```

The operations status view is at <http://localhost:3000> and the live API health endpoint is at <http://localhost:4000/health>.

Seeded development accounts:

| Email | Password | Role |
| --- | --- | --- |
| `admin@ekub.local` | `Admin123!` | Admin |
| `provider@ekub.local` | `Provider123!` | Approved provider |

The seed also creates two manual provider payment-account records and one draft lottery with 10 lots at 100 ETB per ticket. Player records use phone and nickname; players do not have user accounts.

Build all workspace packages with `pnpm build`.