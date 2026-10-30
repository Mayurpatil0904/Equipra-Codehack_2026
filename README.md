# Equipra — Backend

The backend API for **Equipra**, a last-mile logistics platform for university lab equipment. Built for the **FAR AWAY International Hackathon 2026** under the **Logistics & Transit** theme.

Equipra digitises the entire lifecycle of lab equipment — from request, faculty verification, and lab approval, to QR-based collection, return inspection, and 24-hour quarantine before re-issue.

---

## Tech Stack

- **Node.js + Express** — REST API
- **TypeScript** — end-to-end type safety
- **Prisma ORM** — type-safe database access
- **PostgreSQL** — relational database
- **JWT (jsonwebtoken)** — authentication
- **bcryptjs** — password hashing
- **Zod** — request validation
- **Nodemailer** — transactional emails (request updates, approvals)
- **Multer** — file uploads (Excel team-roster imports)
- **Helmet + express-rate-limit** — security hardening

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma        # Database schema (Users, Equipment, Requests, Teams, etc.)
├── src/
│   ├── controllers/         # Route handlers (auth, equipment, requests, admin, messages...)
│   ├── routes/               # Express routers
│   ├── middleware/           # Auth (JWT) + role guards
│   ├── lib/                  # prisma client, jwt, email, QR codes, request/equipment ID generators
│   └── server.ts             # App entrypoint
├── uploads/                   # Uploaded Excel team rosters
└── .env.example
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default `5000`) |
| `JWT_SECRET` | Secret for signing auth tokens — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `CLIENT_URL` | Frontend origin, for CORS and QR-code links (e.g. `https://equipra-app.vercel.app`) |
| `SMTP_*` / `EMAIL_FROM` | Email credentials for notifications |
| `MAX_FILE_SIZE` / `UPLOAD_DIR` | Excel upload limits |

### 3. Set up the database

```bash
npx prisma db push      # sync schema to your database
npx prisma generate     # generate Prisma client
```

### 4. Run in development

```bash
npm run dev
```

Server starts on `http://localhost:5000` (or your configured `PORT`).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `npm run build` | Generate Prisma client, push schema, compile TypeScript |
| `npm start` | Run the compiled production build |
| `npm run db:push` | Push Prisma schema changes to the database |

---

## Core Features

- **Role-based access** — Student / Faculty / Admin (Lab) / Super Admin, enforced via JWT + middleware
- **3-tier approval pipeline** — Student request → Faculty verification → Lab Admin approval
- **Equipment inventory** — auto-generated Equipment IDs (`EQ-0001`...), department-scoped visibility, unit-level availability tracking
- **QR collection passes** — generated on approval, scanned at pickup/return
- **Return inspection workflow** — condition rating, damage notes, automatic 24-hour quarantine before re-listing as available
- **Auto-incrementing request codes** (`REQ00001`...) via a dedicated counter table
- **Team projects** — Excel roster upload, auto-generated Team IDs
- **Messaging** — 50-word capped messages between students, faculty, and lab admins
- **Fault scan history** — full equipment timeline lookup by Equipment ID
- **University/college management** — multi-institution support for Super Admins

---

## Deployment

Deployed on **Render** (free tier). Build command:

```bash
npm run build
```

Start command:

```bash
npm start
```

> ⚠️ Render's free PostgreSQL databases expire after 30 days. Migrate to a permanent free Postgres provider (e.g. Neon, Supabase) before that window closes to avoid data loss.

---

## License

Built for FAR AWAY International Hackathon 2026 — Logistics & Transit theme.
