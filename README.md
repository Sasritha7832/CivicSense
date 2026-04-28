# CivicPulse 🏙️

A full-stack civic issue reporting and tracking platform. Citizens can report local problems (potholes, water leaks, etc.), track their status on a live map, and get real-time updates. Admins can manage issues, assign field officers, view analytics, and export data.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, Leaflet.js, Socket.IO-client, Recharts |
| Backend | Node.js, Express.js, Socket.IO, JWT auth, Multer, Cloudinary |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access 15min + refresh 7d), RBAC (citizen / admin / field_officer) |
| Email | Nodemailer (OTP verification, password reset, status updates) |

## Project Structure

```
civicpulse/
├── client/              # Vite React frontend
│   ├── src/
│   │   ├── api/         # Axios instance with interceptors
│   │   ├── components/  # Navbar, IssueCard, NotificationBell, ImageUpload, ProtectedRoute
│   │   ├── context/     # AuthContext, SocketContext
│   │   └── pages/       # All page components
│   ├── tailwind.config.js
│   └── vite.config.js
└── server/              # Express API server
    ├── controllers/     # Auth, Issues, Comments, Admin, Notifications
    ├── middleware/      # auth.js, errorHandler.js
    ├── prisma/          # schema.prisma
    ├── routes/          # Route definitions
    ├── utils/           # email.js, cloudinary.js, jwt.js
    └── index.js         # Entry point
```

## Setup Instructions

### Prerequisites
- Node.js v18+
- PostgreSQL database
- Cloudinary account (free tier OK)
- SMTP email credentials (Gmail app password works)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

```bash
# In /server, copy and fill in .env.example
cp .env.example .env
```

Fill in these values in `server/.env`:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — random secret strings
- `SMTP_*` — your email credentials (Gmail, Mailgun, etc.)
- `CLOUDINARY_*` — from your Cloudinary dashboard
- `FRONTEND_URL` — `http://localhost:5173` for local dev

### 3. Initialize the Database

```bash
cd server
npx prisma generate
npx prisma db push     # Creates tables (or: npx prisma migrate dev)
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend
cd server
npm run dev            # Runs on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm run dev            # Runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173)

## API Overview

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | Public | Register, send OTP email |
| POST | `/api/auth/verify-email` | Public | Verify OTP |
| POST | `/api/auth/login` | Public | Login, get JWT tokens |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/forgot-password` | Public | Send reset link |
| POST | `/api/auth/reset-password` | Public | Reset password |
| POST | `/api/issues` | Auth | Create issue + upload images |
| GET | `/api/issues` | Public | List/filter/search issues |
| GET | `/api/issues/:id` | Public | Single issue detail |
| PUT | `/api/issues/:id/status` | Admin/Officer | Update status |
| POST | `/api/issues/:id/upvote` | Citizen | Toggle upvote |
| DELETE | `/api/issues/:id` | Admin | Soft delete |
| GET | `/api/admin/dashboard` | Admin | Analytics & stats |
| POST | `/api/admin/issues/:id/assign` | Admin | Assign to officer |
| PUT | `/api/admin/issues/bulk-status` | Admin | Bulk status update |
| GET | `/api/admin/export` | Admin | Export CSV |
| GET | `/api/notifications` | Auth | User notifications |
| PUT | `/api/notifications/:id/read` | Auth | Mark read |
| PUT | `/api/notifications/read-all` | Auth | Mark all read |

## Real-time Events (Socket.IO)

| Event | Direction | Payload |
|-------|-----------|---------|
| `issue:statusUpdated` | Server → Client | `{ issueId, title, status }` |
| `issue:assigned` | Server → Officer | `{ issueId, title, slaDeadline }` |
| `issue:new` | Server → Admin | `{ id, title, category, priority }` |

## Creating an Admin User

After registering normally, update the user role directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
-- Or use Prisma Studio:
npx prisma studio
```

## Key Features

- 🗺️ **Full-screen map** with clustered markers colored by issue status
- 📍 **Click-to-report** — click map to pre-fill lat/lng in report form
- 📸 **Multi-image upload** — drag & drop with preview, stored on Cloudinary
- 🔔 **Real-time notifications** via Socket.IO — status updates, assignments
- 📊 **Admin dashboard** — live stats, Recharts graphs, issues table with SLA timers
- 🔐 **Secure auth** — JWT access + refresh tokens, bcrypt, email OTP verification
- 🛡️ **Security** — Helmet, rate limiting (5 req/15min on login), input sanitization
- 📥 **CSV export** — filtered issue data download
