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

## Provider and admin auth

Provider signup creates an unapproved account. In development, the API logs the verification OTP to its console; submit it to `POST /auth/verify-otp` before provider login. The seeded admin can log in directly. `JWT_SECRET` must be at least 32 bytes.

Available auth routes: `POST /auth/register`, `/auth/verify-otp`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, and `/auth/reset-password`. Login accepts an `identifier` containing an email or provider phone, plus `password`; it returns a 15-minute access token and a rotating refresh token. OTPs and refresh-session hashes are stored in Redis.

Example provider registration:

```sh
curl -X POST http://localhost:4000/auth/register \
	-H 'Content-Type: application/json' \
	-d '{"email":"provider@example.local","phone":"+251911000010","password":"ProviderPass123!","fullName":"Example Provider","displayName":"Example Ekub"}'
```

Use the logged OTP with `{"identifier":"+251911000010","otp":"123456"}` at `/auth/verify-otp`, then log in with `{"identifier":"+251911000010","password":"ProviderPass123!"}`. Send refresh tokens to `/auth/refresh` or `/auth/logout`; send the account identifier to `/auth/forgot-password`, then the logged development OTP and `newPassword` to `/auth/reset-password`.