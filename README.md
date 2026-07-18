# API Gateway — FlySmart

API Gateway for the flight booking platform, serving as the single entry point for all client requests. It handles JWT authentication, role-based access control (RBAC), rate limiting, and reverse-proxy routing before forwarding requests to the Flight and Booking microservices.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_+_RBAC-000000?logo=jsonwebtokens&logoColor=white)
![bcrypt](https://img.shields.io/badge/Passwords-bcrypt-338833)
![Proxy](https://img.shields.io/badge/Proxy-http--proxy--middleware-1F6FEB)
![MySQL](https://img.shields.io/badge/MySQL-Sequelize-4479A1?logo=mysql&logoColor=white)

> **Part of the FlySmart platform** · [Overview](../README.md) · [Live demo](https://flight-frontend-eight.vercel.app/) · [Frontend](../Flight-Frontend) · [Flight Service](../Flight-Service) · [Booking Service](../Flight-booking-Service)

**Public API base URL:** https://api-gateway-flight.onrender.com

### Skills demonstrated

- **Authentication & RBAC** — bcrypt password hashing, JWT issue/verify, and role-gated routes (`customer`, `admin`, `flightcompany`).
- **API gateway pattern** — a single public entrypoint reverse-proxying to internal services with path rewrites.
- **Security boundary design** — admin-only mutation paths, no public admin signup, and rate limiting at the edge.
- **Operational awareness** — `trust proxy` for correct client IPs behind Render, plus a cold-start wake that warms downstream services.
- **Relational auth model** — a many-to-many `User ↔ Roles` schema with Sequelize migrations and seeders.

---

## Role in the system

```text
Client (React)
      │  x-access-token
      ▼
┌──────────────────────────────────────────┐
│           Api_Gateway_Flight             │
│  • Signup / Signin / Admin Signin        │
│  • JWT issue & verify                    │
│  • isAdmin middleware                    │
│  • Rate limit (500 req / 2 min)          │
│  • Proxy → Flight & Booking services     │
└───────┬───────────────────┬──────────────┘
        │                   │
        ▼                   ▼
  Flight-Service      Booking-Service
```

This service is the **security boundary**. Downstream services trust that authenticated traffic arrives through the gateway.

---

## What this service does

- Centralizes **user identity** (signup, signin, password hashing) so Flight and Booking services stay free of auth logic
- Issues and verifies **JWTs** (`x-access-token`) for every protected customer and admin request
- Implements **RBAC** with roles `admin`, `customer`, and `flightcompany` via a many-to-many `User ↔ Roles` model
- Forces new signups into the **`customer`** role only — admins are created in the DB / seeder, never via public signup
- Provides a dedicated **`POST /admin/signin`** that rejects non-admins and returns a JWT with `role: 'admin'`
- Reverse-proxies **Flight** and **Booking** APIs behind authenticated mounts with path rewrite
- Separates **admin catalog mutations** (`/admin/flightservice`) from customer reads (`/flightservice`) using `checkAuth` + `isAdmin`
- Applies a global **rate limiter** (500 requests / 2 minutes) at the edge
- Uses a layered architecture: routes → controllers → services → repositories → Sequelize models
- Surfaces consistent errors via `AppError` + Winston logging

---

## Capabilities

| Capability | Detail |
|------------|--------|
| User auth | Signup & signin with bcrypt + JWT |
| Default role | New users always get `customer` (no public admin signup) |
| Admin auth | `POST /admin/signin` — rejects non-admins; JWT includes `role: 'admin'` |
| RBAC | Roles: `admin`, `customer`, `flightcompany` via `User ↔ Roles` |
| Role assignment | `POST /api/v1/user/role` — authenticated admin can attach roles |
| Customer proxy | `/flightservice/*`, `/bookingservice/*` — requires valid JWT |
| Admin proxy | `/admin/flightservice/*` — requires JWT **and** admin role |
| Rate limiting | Global Express rate limiter (`trust proxy` enabled for Render `X-Forwarded-For`) |
| Layered design | Routes → Controllers → Services → Repositories → Models |
| Bootstrap | Roles seeder + optional admin-user seeder |

---

## Tech stack

- **Runtime:** Node.js, Express
- **ORM:** Sequelize + MySQL
- **Auth:** bcrypt, jsonwebtoken
- **Proxy:** http-proxy-middleware
- **Ops:** express-rate-limit, winston, dotenv, sequelize-cli

---

## Route map

### Health / cold start

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Returns gateway health immediately. Fire-and-forgets `GET /health` to `FLIGHT_SERVICE` and `BOOKING_SERVICE` on every call (errors logged; response is never delayed or failed by downstream). |

### Auth (local)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/user/signup` | Public | Create user + assign `customer` |
| POST | `/api/v1/user/signin` | Public | JWT `{ id, email }` |
| POST | `/api/v1/user/role` | Admin | Assign a role to a user |
| GET | `/api/v1/info` | JWT | Health/info |
| POST | `/admin/signin` | Public* | Admin-only login → JWT `{ id, email, role: 'admin' }` |

\*Credentials are public to call; non-admin accounts receive `401`.

### Proxies

| Mount | Middleware | Target env | Rewrite |
|-------|------------|------------|---------|
| `/flightservice` | `checkAuth` | `FLIGHT_SERVICE` | `^/flightservice` → `/` |
| `/admin/flightservice` | `checkAuth` + `isAdmin` | `FLIGHT_SERVICE` | `^/admin/flightservice` → `/` |
| `/bookingservice` | `checkAuth` | `BOOKING_SERVICE` | `^/bookingservice` → `/` |

**JWT header:** `x-access-token`

---

## Database design

MySQL schema owned by the gateway (identity & authorization only).

```text
Users ──────── <UserRoles> ──────── Roles
  id                 UserId            id
  email (unique)     RoleId            name (ENUM)
  password (hash)                      admin | customer | flightcompany
```

### Tables

**Users**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| email | STRING | Unique, validated email |
| password | STRING | bcrypt-hashed on `beforeCreate` |
| createdAt / updatedAt | DATE | |

**Roles**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | ENUM | `admin`, `customer`, `flightcompany` (default `customer`) |
| createdAt / updatedAt | DATE | |

**UserRoles** (join)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| UserId | INTEGER FK → Users | |
| RoleId | INTEGER FK → Roles | |
| createdAt / updatedAt | DATE | |

### Associations
- `User.belongsToMany(Roles, { through: UserRoles })`
- `Roles.belongsToMany(User, { through: UserRoles })`

### Seeders
1. Roles seeder — inserts `admin`, `customer`, `flightcompany`
2. Admin user seeder — creates a bootstrap admin and links the `admin` role  
   (defaults: `admin@flysmart.com` / `admin123`; override with `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

```bash
npm run db:seed          # all seeders
npm run db:seed:admin    # admin user only
```

---

## Project structure

```text
src/
  config/          # dotenv server config, sequelize config.js
  controllers/     # HTTP adapters
  middlewares/     # validateAuthRequest, checkAuth, isAdmin
  models/          # User, Roles, UserRoles
  migrations/      # schema evolution
  repositories/    # data access
  routes/          # /api/v1 + /admin
  seeders/         # roles + admin bootstrap
  services/        # signup, signin, adminSignin, isAdmin
  utils/           # JWT helpers, enums, AppError, winston
  index.js         # rate limit, proxies, routes, listen
```

---

## Configuration

All configuration is env-driven via `.env` (loaded by `dotenv`). Sequelize reads the DB values through `src/config/config.js` (no committed `config.json`).

```bash
PORT=3001
FLIGHT_SERVICE=http://localhost:<flight-port>
BOOKING_SERVICE=http://localhost:<booking-port>
SALT_ROUNDS=10
JWT_KEY=your-secret
JWT_EXPIRY=1d
DB_USER=root
DB_PASS=
DB_NAME=Auth
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DIALECT=mysql
# optional for admin seeder
ADMIN_EMAIL=admin@flysmart.com
ADMIN_PASSWORD=admin123
```

See [`.env.example`](.env.example) for the full template.

### Run

```bash
npm install
npx sequelize-cli db:migrate
npm run db:seed
npm run dev      # nodemon (local)
npm start        # node src/index.js (production)
```

---

## Security design notes

1. **Admin creation is DB-only** — signup never grants `admin`.
2. **`isAdmin` uses `req.user`** from verified JWT (not a spoofable body id).
3. **Customer vs admin mutation paths** — catalog writes are intended via `/admin/flightservice`.
4. **Rate limiting** protects the public edge before auth and proxy work.
5. **Single public entrypoint** — Flight and Booking services are not meant to be exposed directly to browsers.

---

## Related services

| Repo | Responsibility |
|------|----------------|
| [FlySmart overview](../README.md) | Platform overview + live demo |
| [Flight-Frontend](../Flight-Frontend) | Traveler + admin SPA |
| [Flight-Service](../Flight-Service) | Flight catalog & seat inventory |
| [Flight-booking-Service](../Flight-booking-Service) | Bookings, payment hold, cron, RabbitMQ mail queue |

---

## License

Released under the MIT License.
