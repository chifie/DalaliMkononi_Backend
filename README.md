# DalaliMkononi Backend

Express.js backend for the DalaliMkononi Tanzania real estate & rental management platform, powered by Supabase PostgreSQL.

## Tech Stack

- **Node.js 18+**
- **Express.js 4**
- **Supabase** (PostgreSQL + Auth + RLS)
- **JWT** (jsonwebtoken)
- **bcryptjs** (password hashing)
- **express-validator** (request validation)
- **helmet** (security headers)
- **express-rate-limit** (rate limiting)
- **morgan** (HTTP logging)
- **cors**

## Project Structure

```
.
├── src/
│   ├── index.js                          # Entry point
│   ├── config.js                         # Environment config
│   ├── db/supabase.js                    # Supabase client
│   ├── middleware/
│   │   ├── auth.js                       # JWT authentication & authorization
│   │   ├── errorHandler.js               # Global error handler
│   │   ├── validate.js                   # express-validator wrapper
│   │   └── security.js                   # helmet, rate-limit, morgan
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── properties.controller.js
│   │   ├── invoices.controller.js
│   │   ├── bookings.controller.js
│   │   └── categories.controller.js
│   └── routes/
│       ├── auth.routes.js
│       ├── users.routes.js
│       ├── properties.routes.js
│       ├── invoices.routes.js
│       ├── bookings.routes.js
│       └── categories.routes.js
├── supabase/migrations/                  # Database schema & seed
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_seed_data.sql
├── .env.example
└── package.json
```

## Quick Start

### Prerequisites

- Node.js >= 18
- Supabase project (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/chifie/DalaliMkononi_Backend.git
cd DalaliMkononi_Backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:8080
```

### 3. Run migrations in Supabase SQL Editor

1. Go to your Supabase project → SQL Editor
2. Run `001_initial_schema.sql`
3. Run `002_rls_policies.sql`
4. Run `003_seed_data.sql`

### 4. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:3001`

### Demo Accounts (from seed)

| Role | Email | Password |
|---|---|---|
| Tenant | `asha@dalali.tz` | `tenant123` |
| Landlord | `juma@dalali.tz` | `landlord123` |
| Admin | `admin@dalali.tz` | `admin123` |

---

## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Register with email/phone |
| `POST` | `/auth/login` | ❌ | Login with email or phone |
| `POST` | `/auth/logout` | ✅ | Logout |
| `GET` | `/auth/me` | ✅ | Get current user |

### Users — `/api/users`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/users/me` | ✅ | Any | Get profile |
| `PUT` | `/users/me` | ✅ | Any | Update profile (incl. password) |
| `GET` | `/users/landlords` | ✅ | Any | List landlords |
| `GET` | `/users` | ✅ | Admin | List all users |
| `GET` | `/users/:id` | ✅ | Admin | Get user by ID |
| `DELETE` | `/users/:id` | ✅ | Admin | Delete user |

### Properties — `/api/properties`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/properties/featured` | ❌ | Public | Featured listings |
| `GET` | `/properties` | ❌ | Public | List with filters |
| `GET` | `/properties/:id` | ❌ | Public | Get property detail |
| `GET` | `/properties/my` | ✅ | Landlord | My properties |
| `POST` | `/properties` | ✅ | Landlord/Admin | Create property |
| `PUT` | `/properties/:id` | ✅ | Landlord/Admin | Update property |
| `DELETE` | `/properties/:id` | ✅ | Landlord/Admin | Delete property |
| `PATCH` | `/properties/:id/verify` | ✅ | Admin | Verify property |

### Invoices — `/api/invoices`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/invoices` | ✅ | Any | List invoices (role-filtered) |
| `GET` | `/invoices/:id` | ✅ | Owner/Admin | Get invoice |
| `POST` | `/invoices` | ✅ | Landlord/Admin | Create invoice |
| `PUT` | `/invoices/:id/pay` | ✅ | Tenant | Pay invoice |
| `PUT` | `/invoices/:id/status` | ✅ | Landlord/Admin | Update status |
| `DELETE` | `/invoices/:id` | ✅ | Landlord/Admin | Delete invoice |

### Bookings — `/api/bookings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bookings` | ✅ | Create booking |
| `GET` | `/bookings` | ✅ | List my bookings |
| `GET` | `/bookings/:id` | ✅ | Get booking |
| `PUT` | `/bookings/:id/status` | ✅ | Update status |
| `PUT` | `/bookings/:id/cancel` | ✅ | Cancel booking |

### Categories — `/api/categories`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | ❌ | List all |
| `GET` | `/categories/:slug` | ❌ | Get by slug |
| `GET` | `/categories/:slug/properties` | ❌ | Properties in category |

---

## Changelog

### v1.1.0

- Added `helmet`, `express-rate-limit`, and `morgan` security/logging middleware
- Fixed login to accept both **email and phone number** (`identifier` field)
- Added **phone uniqueness check** on registration
- Separated `config.js` module for clean environment handling
- Added **admin** endpoints: `DELETE /users/:id`, `PATCH /properties/:id/verify`
- Added **password update** support in profile (`PUT /users/me`)
- Added `.env.example`
- Added `vacant` and `is_verified` columns to `properties` table
- Added missing categories: **Villas**, **Offices**, **Shops**
- Fixed inefficient bookings landlord subquery
- Added `updated_at` auto-update triggers on all tables
- Moved Supabase client to `db/supabase.js` module
- Added `vacant` and `is_verified` query filters on properties
- Added phone index on users table
