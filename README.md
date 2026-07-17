# API Gateway — FlySmart

Node.js **API Gateway** for the FlySmart flight booking platform. Owns authentication, role-based access control (RBAC), rate limiting, and reverse-proxy routing to the Flight and Booking microservices.

**Resume highlight:** BFF-style gateway with JWT auth, multi-role RBAC, admin-gated mutation paths, and authenticated reverse proxies to internal services.

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

## Capabilities

| Capability | Detail |
|------------|--------|
| User auth | Signup & signin with bcrypt + JWT |
| Default role | New users always get `customer` (no public admin signup) |
| Admin auth | `POST /admin/signin` — rejects non-admins; JWT includes `role: 'admin'` |
| RBAC | Roles: `admin`, `customer`, `flightcompany` via `User ↔ Roles` |
| Customer proxy | `/flightservice/*`, `/bookingservice/*` — requires valid JWT |
| Admin proxy | `/admin/flightservice/*` — requires JWT **and** admin role |
| Rate limiting | Global Express rate limiter |
| Layered design | Routes → Controllers → Services → Repositories → Models |

---

## Tech stack

- **Runtime:** Node.js, Express
- **ORM:** Sequelize + MySQL
- **Auth:** bcrypt, jsonwebtoken
- **Proxy:** http-proxy-middleware
- **Ops:** express-rate-limit, winston, dotenv

---

## Route map

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
  config/          # dotenv server config, sequelize config.json
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

Create `.env` (and Sequelize `src/config/config.json`):

```bash
PORT=3001
FLIGHT_SERVICE=http://localhost:<flight-port>
BOOKING_SERVICE=http://localhost:<booking-port>
SALT_ROUNDS=10
JWT_KEY=your-secret
JWT_EXPIRY=1d
# optional for admin seeder
ADMIN_EMAIL=admin@flysmart.com
ADMIN_PASSWORD=admin123
```

### Run

```bash
npm install
npx sequelize-cli db:migrate
npm run db:seed
npm run dev
```

---

## Security design notes

1. **Admin creation is DB-only** — signup never grants `admin`.
2. **`isAdmin` uses `req.user`** from verified JWT (not a spoofable body id).
3. **Customer vs admin mutation paths** — catalog writes are intended via `/admin/flightservice`.
4. **Rate limiting** protects the public edge before auth and proxy work.

---

## Related services

| Repo | Responsibility |
|------|----------------|
| [Flight-Frontend](../Flight-Frontend) | Traveler + admin SPA |
| [Flight-Service](../Flight-Service) | Flight catalog & seat inventory |
| [Flight-booking-Service](../Flight-booking-Service) | Bookings, payment hold, cron |

---

## License

Private / educational project.
