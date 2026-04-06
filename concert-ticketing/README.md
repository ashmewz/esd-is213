# StagePass — Concert Ticketing System

A microservices-based concert ticketing platform built for IS213 Enterprise Solution Development.

---

## Prerequisites

Make sure the following are installed on your machine:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2)
- [Node.js](https://nodejs.org/) v18+ and npm (for running the UI locally)
- Git

---

## Environment Setup

### 1. Create the `.env` file

In the project root (`concert-ticketing/`), create a file named `.env` with the following content.  
Contact the team for the actual credential values.

```env
# Supabase PostgreSQL (shared DB for all Python services)
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres

# Stripe (payment processing)
STRIPE_SECRET_KEY=sk_test_...

# SMTP (email notifications via Gmail)
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your@gmail.com

# Telegram bot (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

> **Note:** SMTP requires a Gmail App Password, not your regular Gmail password.  
> Generate one at: Google Account → Security → 2-Step Verification → App Passwords.

---

## Running the Application

### Step 1 — Start all backend services

From the `concert-ticketing/` root directory:

```bash
docker compose up --build
```

This starts all services:

| Container | Port | Description |
|---|---|---|
| `rabbitmq` | 5672 / 15672 | Message broker (management UI at :15672) |
| `events-service` | 5001 | Atomic — event & seat data |
| `seat-allocation-service` | 5002 | Atomic — seat holds & assignments |
| `swap-service` | 5003 | Atomic — swap request management |
| `user-service` | 5004 / 50051 | Atomic — user auth (REST + gRPC) |
| `booking-service` | 5005 | Composite — booking orchestration |
| `swap-orchestration-service` | 5006 | Composite — swap workflow |
| `notification-service` | 5007 | Wrapper — email notifications via RabbitMQ |
| `payment-service` | 5008 | Wrapper — Stripe payments |
| `kong` | 8000 / 8001 | API Gateway (all UI traffic goes through :8000) |

Wait until all containers are healthy (you can check with `docker compose ps`).

### Step 2 — Start the frontend UI

In a new terminal:

```bash
cd ui
npm install
npm run dev
```

The UI will be available at: **http://localhost:5173**

---

## Architecture Overview

```
UI (React, :5173)
    │
    ▼
Kong API Gateway (:8000)
    │
    ├── /users, /users/login     → user-service (gRPC + REST)
    ├── /events, /events/:id     → events-service
    ├── /place-booking           → booking-service (composite)
    ├── /orders                  → OutSystems (external order service)
    ├── /seat-assignments        → seat-allocation-service
    ├── /swap-requests           → swap-orchestration-service
    ├── /swap-matches            → swap-orchestration-service
    ├── /notifications           → notification-service
    └── /payments                → payment-service

RabbitMQ (exchange: concert_ticketing)
    ├── ticket.purchased         → notification-service
    ├── seatmap.changed          → seat-allocation-service
    ├── seat.reassigned          → notification-service → OutSystems
    ├── payment.refund.issued    → notification-service → OutSystems
    ├── swap.matched             → notification-service
    ├── swap.completed           → notification-service
    └── swap.failed              → notification-service
```

**External services:**
- **OutSystems** — order management (hosted at outsystemscloud.com)
- **Stripe** — payment processing
- **Supabase** — PostgreSQL database hosting

---

## Scenarios

### Scenario A — Ticket Purchase
1. Register/login at http://localhost:5173
2. Browse events → select a seat → checkout with card number `4242 4242 4242 4242`, any future expiry, any CVC
3. Order confirmation email is sent; ticket appears under **My Tickets**

### Scenario B — Seatmap Change (Choreography)
1. Login as admin (role: `admin`)
2. Go to Admin panel → select an event → update the seatmap (remove seats)
3. Affected sold seats trigger automatic reassignment or refund via RabbitMQ
4. Customers receive email notification of their new seat or refund

### Scenario C — Seat Swap
1. User A (e.g. has CAT1 seat) goes to **Swap** → lists their ticket
2. User B (e.g. has CAT2 seat) goes to **Swap** → lists their ticket for the opposite tier
3. System auto-matches them; both receive a "Swap Match Found" email
4. Both users accept the offer on the Swap page
5. Seats are exchanged; price difference is charged/refunded via Stripe
6. Both receive a "Seat Swap Complete" email with new seat details

---

## Database Migrations

Migrations run automatically on container startup via `entrypoint.sh` in each service. No manual steps needed.

---

## RabbitMQ Management UI

Access at **http://localhost:15672**  
Credentials: `guest` / `guest`

---

## Useful Commands

```bash
# View logs for a specific service
docker compose logs -f notification-service

# Rebuild a single service after code changes
docker compose up --build notification-service

# Stop all services
docker compose down

# Stop and remove all volumes (fresh DB state)
docker compose down -v
```

---

## Project Structure

```
concert-ticketing/
├── docker-compose.yml
├── .env                          # (create this — not committed)
├── grpc/
│   └── user-service/             # User auth service (Flask + gRPC)
├── services/
│   ├── atomic/
│   │   ├── events-service/       # Events & seatmap
│   │   ├── seat-allocation-service/  # Seat holds & assignments
│   │   └── swap-service/         # Swap request state machine
│   ├── composite/
│   │   ├── booking-service/      # Orchestrates booking flow
│   │   └── swap-orchestration-service/  # Orchestrates swap flow
│   └── wrapper/
│       ├── notification-service/ # Email notifications (RabbitMQ consumer)
│       └── payment-service/      # Stripe payment wrapper
├── infrastructure/
│   ├── kong/                     # Kong API Gateway config
│   └── rabbitmq/                 # RabbitMQ config
└── ui/                           # React + Vite frontend
```

---

## Team

IS213 G1 Team 3 — SMU School of Computing and Information Systems

Ash · Kai Kin · Kai Wen · Norven · Yujia · Zhuo Yu
