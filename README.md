# 8Care — Full-Stack Technical Test

A production-ready user and role management system with authentication, authorization, OTP 2FA, and OAuth SSO.

## 🚀 Tech Stack

**Backend (API):**
- NestJS
- Prisma ORM
- PostgreSQL 18
- Redis 8.2
- TypeScript
- Zod validation
- Passport.js (JWT, Google OAuth, GitHub OAuth)
- Pino logging

**Frontend (Web):**
- Next.js 16 (App Router)
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui + Radix UI
- Zustand (state management)
- React Hook Form + Zod
- Axios

**Infrastructure:**
- Docker & Docker Compose
- MinIO (S3-compatible storage)
- MailHog (email testing)
- GitHub Actions (CI/CD)

## 📋 Features

### Core Features
✅ User authentication (signup, login, logout)
✅ Email verification
✅ Role-based access control (RBAC)
✅ 30-day session handling with refresh tokens
✅ User management (CRUD)
✅ Profile management with role-specific fields

### Bonus Features
✅ OTP 2FA (email-based with Redis)
✅ Google OAuth SSO
✅ GitHub OAuth SSO
✅ Account linking by email
✅ Full audit logging
✅ File uploads (avatars via MinIO)
✅ Rate limiting
✅ OpenAPI/Swagger documentation
✅ WCAG 2.1 AA accessibility

## 🔐 User Roles

- **SUPER_ADMIN** — Full system access, can see all users and audit logs
- **COORDINATOR** — Can view and manage caregivers and patients
- **CAREGIVER** — Can view and edit own profile
- **PATIENT** — Can view and edit own profile

## 🏁 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for local development)
- npm 10+

### 1. Clone and Setup

```bash
git clone <repository-url>
cd 8care

# Copy environment files
cp api/.env.example api/.env
cp web/.env.example web/.env
```

### 2. Start with Docker

```bash
docker-compose up --build
```

This will start all services:
- **API**: http://localhost:4000
- **Web**: http://localhost:3000
- **MailHog UI**: http://localhost:8025
- **MinIO Console**: http://localhost:9001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Access the Application

Open http://localhost:3000 in your browser.

## 👥 Seed Users

The database is automatically seeded with one user per role:

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | superadmin@8care.ai | SuperAdmin123! |
| COORDINATOR | coordinator@8care.ai | Coordinator123! |
| CAREGIVER | caregiver@8care.ai | Caregiver123! |
| PATIENT | patient@8care.ai | Patient123! |

All seed users have verified emails and can log in immediately.

## 📡 API Documentation

Once the API is running, visit:
- **Swagger UI**: http://localhost:4000/api/docs
- **OpenAPI JSON**: http://localhost:4000/api/docs-json

## 🧪 Testing

### Backend Tests

```bash
cd api
npm install
npm run test
```

### Frontend Tests

```bash
cd web
npm install
npm run test
```

### E2E Tests (via Docker)

```bash
# Run tests in isolated containers
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 🛠️ Development (Local)

### API Development

```bash
cd api
npm install
cp .env.example .env

# Start dependencies (Postgres, Redis, MinIO, MailHog)
docker-compose up postgres redis minio mailhog

# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed database
npm run seed

# Start dev server
npm run start:dev
```

### Web Development

```bash
cd web
npm install
cp .env.example .env

# Start dev server
npm run dev
```

## 📁 Project Structure

```
8care/
├── api/                    # NestJS Backend
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # Users module
│   │   ├── roles/         # Roles & permissions
│   │   ├── audit/         # Audit logging
│   │   ├── storage/       # File uploads
│   │   ├── mail/          # Email service
│   │   ├── config/        # Configuration
│   │   └── common/        # Shared utilities
│   ├── prisma/            # Database schema & migrations
│   ├── test/              # Integration tests
│   └── Dockerfile
├── web/                    # Next.js Frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities & API client
│   ├── hooks/             # Custom hooks
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   └── Dockerfile
├── docker-compose.yml      # Docker orchestration
├── PLAN.md                 # Detailed execution plan
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

See `.env.example` files in `api/` and `web/` directories for all available configuration options.

**Important for Production:**
- Generate strong JWT secrets (min 32 characters)
- Configure real SMTP server (replace MailHog)
- Set up OAuth credentials (Google, GitHub)
- Configure CORS origins properly
- Enable HTTPS/SSL

### OAuth Setup

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:4000/api/v1/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in API `.env`

**GitHub OAuth:**
1. Go to [GitHub Settings > Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `http://localhost:4000/api/v1/auth/github/callback`
4. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in API `.env`

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check which process is using the port
lsof -ti:3000
lsof -ti:4000

# Kill the process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
cd api && npx prisma migrate reset
```

### Docker Build Issues
```bash
# Clean rebuild
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
docker-compose up
```

### MinIO Bucket Not Created
```bash
# Manually create bucket
docker exec -it 8care-minio-init sh
mc alias set minio http://minio:9000 minioadmin minioadmin123
mc mb minio/8care-avatars
mc anonymous set public minio/8care-avatars
```

## 📊 Architecture Decisions

See `docs/adr/` directory for Architecture Decision Records documenting key design choices:
- Multi-repo structure
- JWT with refresh tokens in httpOnly cookies
- RBAC with permissions table
- OTP via email with Redis
- MinIO for S3-compatible storage
- Zustand for state management
- shadcn/ui component strategy

## ✅ Completed Features

- [x] Docker Compose setup with all services
- [x] NestJS API with modular architecture
- [x] Next.js App Router with TypeScript
- [x] PostgreSQL database with Prisma ORM
- [x] Redis for OTP and caching
- [x] Authentication (signup, login, logout)
- [x] Email verification
- [x] JWT access & refresh tokens (30-day sessions)
- [x] Role-based access control (4 roles)
- [x] User management interface
- [x] Profile pages with role-specific fields
- [x] OTP 2FA (optional, email-based)
- [x] Google OAuth SSO
- [x] GitHub OAuth SSO
- [x] Account linking by email
- [x] File uploads (avatars via MinIO)
- [x] Full audit logging
- [x] Rate limiting
- [x] OpenAPI/Swagger documentation
- [x] Integration tests (backend)
- [x] Component tests (frontend)
- [x] GitHub Actions CI/CD
- [x] WCAG 2.1 AA accessibility
- [x] Structured logging (Pino)
- [x] Health check endpoints
- [x] Seed data script

## 📝 License

This project is part of a technical assessment for 8Care.

## 🤝 Contact

For questions or issues, please contact the development team.

---

**Built with ❤️ using modern best practices and industry standards.**
