# NutriBox API

> REST API for managing orders, users, and products for **NutriBox S.A.**, a healthy food subscription company.

![Node.js](https://img.shields.io/badge/Node.js-v20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue)
![Express](https://img.shields.io/badge/Express-v4-lightgrey)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)
![Tests](https://img.shields.io/badge/tests-Jest%20%2B%20Supertest-C21325)

## Live Demo

**API URL:** `https://YOUR-APP.up.railway.app` <!-- TODO: replace with the Railway URL after deploying -->

Health check: `GET /health` · API base: `/api/v1`

## Table of Contents

- [About](#about) | [Tech Stack](#tech-stack) | [Installation](#installation)
- [Environment Variables](#environment-variables) | [API Endpoints](#api-endpoints) | [Architecture](#architecture)
- [Data Model](#data-model) | [Testing](#testing) | [Deployment](#deployment) | [Roadmap](#roadmap-v20)

## About

NutriBox API is the backend for a meal-box subscription business. Customers register, browse
the catalog, place orders and leave product reviews. Administrators manage the catalog and stock,
move orders through their lifecycle and consult sales reports.

Highlights:

- **JWT authentication** with role-based authorization (`USER` / `ADMIN`) and bcrypt password hashing.
- **Dual database**: MySQL for transactional data, MongoDB for activity logs and product reviews.
- **Stock integrity**: order totals are computed server-side; confirming an order decrements stock
  atomically through the `sp_confirm_order` stored procedure, and cancelling a confirmed order restores it.
- **Order state machine**: `PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED` (or `CANCELLED`).
- **Runtime validation** of body and query params with Zod and consistent JSON error responses.
- **Security layers**: Helmet, CORS, rate limiting on auth endpoints, no secrets in code.

## Tech Stack

Node.js · TypeScript · Express · MySQL · Sequelize · MongoDB · Mongoose · JWT · bcrypt · Zod · Jest · Supertest

## Installation

**Prerequisites:** Node.js 20+, MySQL 8 and a MongoDB instance (local or Atlas).

```bash
git clone https://github.com/ujeisson-alt/nutribox-api.git
cd nutribox-api && npm install
cp .env.example .env            # fill in the variables

# Create the schema (tables, view and stored procedure) and load sample catalog data
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql

# Create the first ADMIN user (reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env)
npm run seed

npm run dev                     # http://localhost:3000
```

| Script | Description |
| --- | --- |
| `npm run dev` | Development server with hot reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build (production) |
| `npm test` | Run unit and integration tests |
| `npm run seed` | Create the initial ADMIN user |

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port (default `3000`) |
| `NODE_ENV` | No | `development` \| `production` \| `test` |
| `FRONTEND_URL` | No | Allowed CORS origin (default `*`) |
| `DATABASE_URL` | No* | MySQL connection string (`mysql://user:pass@host:port/db`). Overrides `DB_*` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Yes* | MySQL connection (*if `DATABASE_URL` is not set) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign tokens (32+ random characters in production) |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `24h`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Seed only | Credentials for `npm run seed` |

## API Endpoints

Base URL: `/api/v1` · Auth header: `Authorization: Bearer <token>`

| Method | Route | Description | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | Register a user and get a JWT | Public |
| POST | `/auth/login` | Log in and get a JWT | Public |
| GET | `/auth/me` | Current user profile | AUTH |
| POST | `/auth/logout` | Log out (audit log entry) | AUTH |
| GET | `/users` | List all users | ADMIN |
| GET | `/users/:id` | Get user by ID | ADMIN |
| POST | `/users` | Create a user (`role: ADMIN` requires an ADMIN token) | Public |
| PUT | `/users/:id` | Update user (owner or ADMIN; only ADMIN changes `role`/`isActive`) | AUTH |
| DELETE | `/users/:id` | Deactivate user (soft delete) | ADMIN |
| GET | `/products` | List products. Filters: `categoryId`, `minPrice`, `maxPrice`, `search`, `inStock`, `page`, `limit` | Public |
| GET | `/products/:id` | Get product with stock and rating summary | Public |
| POST | `/products` | Create product (with initial `stock`) | ADMIN |
| PUT | `/products/:id` | Update product and/or stock | ADMIN |
| DELETE | `/products/:id` | Delete product (soft delete) | ADMIN |
| GET | `/products/:id/reviews` | List product reviews (MongoDB) | Public |
| POST | `/products/:id/reviews` | Add a review (one per user and product) | AUTH |
| GET | `/categories` | List categories | Public |
| POST | `/categories` | Create category | ADMIN |
| GET | `/orders` | List orders (users see their own; ADMIN sees all). Filters: `status`, `page`, `limit` | AUTH |
| GET | `/orders/:id` | Get order with items | AUTH |
| POST | `/orders` | Create order | AUTH |
| PATCH | `/orders/:id/status` | Update order status | ADMIN |
| GET | `/orders/:id/items` | Items of an order | AUTH |
| GET | `/reports/sales` | Sales report. Query: `from`, `to` (`YYYY-MM-DD`, default last 30 days) | ADMIN |
| GET | `/reports/pending-today` | Today's pending orders (SQL view) | ADMIN |

### Examples

```http
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [{ "productId": 1, "quantity": 2 }, { "productId": 5, "quantity": 1 }],
  "deliveryAddress": "Calle 123 #45-67, Bogotá",
  "deliveryDate": "2030-01-15"
}
```

```json
{ "success": false, "message": "Datos de entrada inválidos", "errors": { "email": ["Email inválido"] } }
```

**Status codes used:** `200` OK · `201` Created · `400` validation error · `401` missing/invalid token ·
`403` insufficient role · `404` not found · `409` conflict (duplicate email, insufficient stock,
invalid status transition) · `429` too many requests · `500` unexpected error.

A ready-to-use **Postman collection** (Auth, Users, Products, Orders, Reports) and environments are in
[`docs/postman`](docs/postman). Logging in from Postman saves the token automatically.

## Architecture

```
src/
├── config/        # MySQL (Sequelize) and MongoDB (Mongoose) connections
├── controllers/   # Request handling and business rules per resource
├── middlewares/   # auth, roles, Zod validation, rate limiting, error handler
├── models/
│   ├── mysql/     # Sequelize models + associations
│   └── mongo/     # Mongoose schemas (ActivityLog, ProductReview)
├── routes/        # Endpoint definitions per resource
├── schemas/       # Zod validation schemas
├── types/         # Shared TypeScript types
└── utils/         # JWT helpers, logger, activity logger, seed
database/          # schema.sql (tables, view, stored procedure) and seed.sql
docs/              # ER diagram and Postman collection
tests/             # Jest unit and integration tests
```

### Architecture Decisions

- **MVC pattern** for code organization: routes → middlewares → controllers → models.
- **Dual database approach**: MySQL for relational, transactional data (users, products, orders, stock);
  MongoDB for high-volume, flexible data (activity logs with a 90-day TTL index, product reviews).
- **JWT with role-based authorization**: stateless tokens carrying `id` and `role`; `requireRole` and
  `requireSelfOrAdmin` middlewares protect routes.
- **Zod for runtime input validation** of body and query strings, with field-level error messages.
- **Prices are never trusted from the client**: order totals use current DB prices, stored as `unit_price`.
- **Soft deletes** for users and products to keep order history intact (`ON DELETE CASCADE/RESTRICT`).
- **Stored procedure for confirmation**: `sp_confirm_order` runs in a transaction and rolls back if any
  stock would go negative (`CHECK (quantity >= 0)`), preventing overselling.
- **Resilient logging**: failures writing to MongoDB never break the main MySQL request.
- **Centralized error handling** with consistent `{ success, message }` responses and no stack traces in production.

## Data Model

![ER Diagram](docs/der.png)

MongoDB collections: `activitylogs` (`LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `ORDER_CREATED`,
`PROFILE_UPDATED`) and `productreviews` (rating 1–5, one review per user and product).

## Testing

```bash
npm test
```

- **Unit tests** (no database): Zod schemas, JWT helpers, 401/403/404 responses, order state machine.
- **Integration tests** (real MySQL + MongoDB): full flow register → login → order → confirm (stock
  decremented) → sales report → cancel (stock restored) → reviews. They run only when
  `RUN_INTEGRATION=true`; copy `.env.test.example` to `.env.test` and create the `nutribox_test` database
  as described in that file.

## Deployment

Deployed on **Railway**:

1. New project → *Deploy from GitHub repo* → `nutribox-api`. Railway runs `npm run build` and `npm start`.
2. Add a **MySQL** service and run `database/schema.sql` and `database/seed.sql` against it with the `mysql` CLI.
3. Set the app variables: `DATABASE_URL` pointing to the `nutribox_db` database, `MONGODB_URI` (MongoDB Atlas), `JWT_SECRET`,
   `NODE_ENV=production`.
4. Run `npm run seed` once (with `SEED_ADMIN_*` set) to create the first admin.
5. Check `GET /health` and switch the Postman `baseUrl` to the public URL.

## Roadmap (v2.0)

- Swagger / OpenAPI documentation
- Redis cache for the sales report
- Email notifications with Nodemailer when an order is confirmed
- Refresh tokens and token revocation on logout

## Author

**Jeisson Uribe** — [LinkedIn](https://www.linkedin.com/in/jeisson-uribe-qa-data) · [GitHub](https://github.com/ujeisson-alt)
