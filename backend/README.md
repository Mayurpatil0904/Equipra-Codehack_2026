# Equipra Backend

**Node.js + Express + Prisma + PostgreSQL**

Complete REST API backend for the Equipra academic lab management platform.

---

## 📁 Project Structure

```
equipra-backend/
├── prisma/
│   ├── schema.prisma        ← Full database schema (13 models)
│   └── seed.ts              ← Seed colleges, users, equipment, demo team
├── src/
│   ├── server.ts            ← Entry point — starts Express + DB connection
│   ├── app.ts               ← Express app — middleware, routes, error handler
│   ├── lib/
│   │   ├── prisma.ts        ← Prisma client singleton
│   │   ├── jwt.ts           ← Sign / verify JWT tokens
│   │   ├── email.ts         ← Nodemailer — all notification email templates
│   │   ├── notify.ts        ← In-app notification helpers
│   │   ├── response.ts      ← Typed HTTP response helpers + AppError
│   │   └── api-client.ts    ← Frontend typed API client (copy to frontend)
│   ├── middleware/
│   │   ├── auth.ts          ← JWT auth guard + role guard
│   │   ├── errorHandler.ts  ← Global error handler
│   │   └── upload.ts        ← Multer for Excel/CSV uploads
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── equipment.controller.ts
│   │   ├── requests.controller.ts   ← Full 3-stage approval workflow
│   │   ├── teams.controller.ts      ← Team creation + Excel upload
│   │   ├── faultScan.controller.ts
│   │   ├── feedback.controller.ts
│   │   ├── messages.controller.ts
│   │   ├── notifications.controller.ts
│   │   └── admin.controller.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── equipment.routes.ts
│       ├── requests.routes.ts
│       ├── teams.routes.ts
│       ├── faultScan.routes.ts
│       ├── feedback.routes.ts
│       ├── messages.routes.ts
│       ├── notifications.routes.ts
│       └── admin.routes.ts
└── package.json
```

---

## 🚀 Setup (Step by Step)

### Step 1 — Install PostgreSQL

**Option A: Local install**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu / WSL
sudo apt install postgresql
sudo service postgresql start
```

**Option B: Docker (recommended)**
```bash
docker run --name equipra-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=equipra_db \
  -p 5432:5432 \
  -d postgres:16
```

**Option C: Free cloud DB**
- [Supabase](https://supabase.com) — free PostgreSQL, just copy the connection string
- [Neon](https://neon.tech) — free serverless Postgres

---

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/equipra_db"
JWT_SECRET="generate_a_random_64_char_string_here"
CLIENT_URL="http://localhost:5173"

# For email (use Mailtrap for testing — free)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Step 3 — Install dependencies

```bash
npm install
```

---

### Step 4 — Push schema to database

```bash
npm run db:push
```

This reads `prisma/schema.prisma` and creates all tables in your database.

---

### Step 5 — Seed demo data

```bash
npm run db:seed
```

This creates:
- 5 colleges (Parul University, MS University, SVNIT, PDPU, GEC Vadodara)
- Demo student, faculty, and admin users
- All 13 hardware items from the frontend
- 1 demo active team (TEAM-PU-0042)

---

### Step 6 — Start the server

```bash
npm run dev       # Development (auto-restarts on file changes)
npm run build     # Build to dist/
npm start         # Production
```

Server runs on **http://localhost:5000**

---

## 🔐 Demo Credentials

| Role        | Enrollment ID | Password     |
|-------------|---------------|--------------|
| Student     | PU-STU-001    | student123   |
| Faculty     | PU-FAC-001    | faculty123   |
| Admin / Lab | PU-ADM-001    | admin123     |

---

## 📡 API Reference

### Auth
| Method | Endpoint                  | Auth | Description           |
|--------|---------------------------|------|-----------------------|
| POST   | `/api/auth/login`         | ❌   | Login, get JWT token  |
| GET    | `/api/auth/me`            | ✅   | Get current user      |
| PUT    | `/api/auth/change-password` | ✅ | Change password       |

### Equipment
| Method | Endpoint                  | Role   | Description           |
|--------|---------------------------|--------|-----------------------|
| GET    | `/api/equipment`          | Any    | List all (filterable) |
| GET    | `/api/equipment/categories` | Any  | Distinct categories   |
| GET    | `/api/equipment/:slug`    | Any    | Single item + timeline|
| POST   | `/api/equipment`          | Admin  | Add new item          |
| PATCH  | `/api/equipment/:slug`    | Admin  | Update item           |
| DELETE | `/api/equipment/:slug`    | Admin  | Soft-delete item      |

### Requests (Approval Workflow)
| Method | Endpoint                           | Role    | Description                     |
|--------|------------------------------------|---------|----------------------------------|
| GET    | `/api/requests`                    | Any     | List (scoped by role)            |
| GET    | `/api/requests/:id`                | Any     | Single request + messages        |
| POST   | `/api/requests`                    | Student | Submit new request               |
| POST   | `/api/requests/:id/faculty-decision` | Faculty | Approve → pending_lab or Reject|
| POST   | `/api/requests/:id/lab-decision`   | Admin   | Final approve/reject + message  |
| POST   | `/api/requests/:id/messages`       | Any     | Add message (≤50 words)         |

### Teams
| Method | Endpoint                          | Role    | Description              |
|--------|-----------------------------------|---------|--------------------------|
| GET    | `/api/teams`                      | Any     | List teams (role-scoped) |
| GET    | `/api/teams/:code`                | Any     | Get team by Team ID      |
| POST   | `/api/teams`                      | Faculty | Create team              |
| POST   | `/api/teams/:code/upload-members` | Faculty | Upload Excel member list |
| PATCH  | `/api/teams/:code/deactivate`     | Faculty | Mark project complete    |

### Fault Scans
| Method | Endpoint         | Role  | Description             |
|--------|------------------|-------|-------------------------|
| GET    | `/api/fault-scans` | Any | List scans              |
| POST   | `/api/fault-scans` | Admin| Record new scan         |

### Feedback
| Method | Endpoint                | Role  | Description            |
|--------|-------------------------|-------|------------------------|
| POST   | `/api/feedback`         | Any   | Submit feedback        |
| GET    | `/api/feedback`         | Admin | View all feedback      |
| PATCH  | `/api/feedback/:id/read`| Admin | Mark as read           |

### Messages (Direct)
| Method | Endpoint                         | Auth | Description           |
|--------|----------------------------------|------|-----------------------|
| GET    | `/api/messages/threads`          | ✅   | List conversations    |
| GET    | `/api/messages/threads/:partner` | ✅   | Get full thread       |
| POST   | `/api/messages/threads/:partner` | ✅   | Send message (≤50 words)|

### Notifications
| Method | Endpoint                    | Auth | Description          |
|--------|-----------------------------|------|----------------------|
| GET    | `/api/notifications`        | ✅   | List notifications   |
| PATCH  | `/api/notifications/read-all`| ✅  | Mark all as read     |
| PATCH  | `/api/notifications/:id/read`| ✅  | Mark one as read     |

### Admin
| Method | Endpoint                       | Role  | Description          |
|--------|--------------------------------|-------|----------------------|
| GET    | `/api/admin/stats`             | Admin | Full statistics      |
| GET    | `/api/admin/users`             | Admin | List all users       |
| POST   | `/api/admin/users`             | Admin | Register new user    |
| PATCH  | `/api/admin/users/:id/deactivate` | Admin | Deactivate user   |
| GET    | `/api/admin/colleges`          | Admin | List colleges        |

---

## 🔗 Connecting Frontend to Backend

1. Copy `src/lib/api-client.ts` to your frontend `equipra/src/lib/api.ts`

2. Add to frontend `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

3. In `AppContext.tsx`, replace in-memory state calls with API calls:

```tsx
// BEFORE (in-memory)
const login = (user, role) => { setUser(user); setRole(role); };

// AFTER (real API)
const login = async (enrollmentId, password, collegeName, role) => {
  const { token, user } = await authApi.login({ enrollmentId, password, collegeName, role });
  tokenStore.set(token);
  setUser(user);
  setRole(user.role.toLowerCase());
};
```

---

## 🌐 Deployment

### Railway (Recommended — free tier)
```bash
# Install Railway CLI
npm install -g @railway/cli

railway login
railway init
railway add postgresql    # provisions a free Postgres DB
railway up                # deploys the backend
```

### Render
1. Push backend to GitHub
2. New Web Service → connect repo
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Add environment variables in dashboard
6. Add a PostgreSQL database in Render

### Frontend (Vercel)
```bash
cd equipra
vercel --prod
# Set VITE_API_URL=https://your-backend.railway.app/api
```

---

## 🛠️ Useful Commands

```bash
npm run db:studio    # Open Prisma Studio (visual DB browser) at localhost:5555
npm run db:migrate   # Create and run a new migration
npm run db:reset     # Drop all tables + re-seed (dev only)
```
