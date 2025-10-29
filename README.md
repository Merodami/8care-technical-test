# 8Care — Full-Stack Role Management System

A production-ready user and role management system with authentication, authorization, OTP 2FA, and OAuth SSO.

## 🚀 Tech Stack

**Backend (API):**
- NestJS 11
- Prisma ORM 6
- PostgreSQL 18 (Alpine)
- Redis 8.2 (Alpine)
- TypeScript
- Zod validation
- Passport.js (JWT, Google OAuth, GitHub OAuth)
- Pino logging
- bcrypt password hashing

**Frontend (Web):**
- Next.js 16 (App Router)
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui + Radix UI
- Zustand (state management)
- React Hook Form + Zod
- Axios with auto-refresh interceptors

**Infrastructure:**
- Docker & Docker Compose
- MinIO (S3-compatible storage)
- MailHog (email testing)
- Multi-stage Docker builds
- Health checks & auto-restart

## 📋 Features

### Core Features
✅ User authentication (signup, login, logout)
✅ Email verification (required)
✅ Role-based access control (RBAC)
✅ 30-day session handling with refresh tokens
✅ User management (CRUD)
✅ Profile management with role-specific fields
✅ JWT tokens in httpOnly cookies
✅ Password reset flow

### Bonus Features
✅ **OTP 2FA** (email-based with Redis)
✅ **Google OAuth SSO**
✅ **GitHub OAuth SSO**
✅ Account linking by email
✅ Full audit logging
✅ File uploads (avatars via MinIO)
✅ Rate limiting
✅ OpenAPI/Swagger documentation
✅ WCAG 2.1 AA accessibility
✅ Structured logging (Pino)
✅ Database seeding

## 🔐 User Roles

- **SUPER_ADMIN** — Full system access, can see all users and audit logs
- **COORDINATOR** — Can view and manage caregivers and patients
- **CAREGIVER** — Can view and edit own profile
- **PATIENT** — Can view and edit own profile

## 🏁 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for local development only)
- npm 10+

### 1. Clone and Setup

```bash
git clone git@github.com:Merodami/8care-technical-test.git
cd 8care

# Copy environment files (optional - defaults work for development)
cp api/.env.example api/.env
cp web/.env.example web/.env
```

### 2. Start with Docker Compose

```bash
# Start all services (first time will take 3-5 minutes to build)
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f api
docker-compose logs -f web
```

This will start all services:
- **API**: http://localhost:4000
- **Web**: http://localhost:3000
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **MailHog UI**: http://localhost:8026
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **PostgreSQL**: localhost:5434
- **Redis**: localhost:6381

### 3. Access the Application

Open http://localhost:3000 in your browser.

The database is automatically:
- Migrated with Prisma
- Seeded with users, roles, and permissions

## 👥 Seed Users

All seed users have **verified emails** and can log in immediately:

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | superadmin@8care.ai | SuperAdmin123! |
| COORDINATOR | coordinator@8care.ai | Coordinator123! |
| CAREGIVER | caregiver@8care.ai | Caregiver123! |
| PATIENT | patient@8care.ai | Patient123! |

## 📡 API Documentation

Once the API is running:
- **Swagger UI**: http://localhost:4000/api/docs
- **OpenAPI JSON**: http://localhost:4000/api/docs-json
- **Health Check**: http://localhost:4000/api/v1/health

### Key API Endpoints

**Authentication:**
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login (returns JWT or OTP challenge)
- `POST /api/v1/auth/otp/verify` - Verify OTP code
- `GET /api/v1/auth/verify-email?token=...` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/google` - Google OAuth login
- `GET /api/v1/auth/github` - GitHub OAuth login

**Users (requires authentication):**
- `GET /api/v1/users` - List users (with filters)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `POST /api/v1/users/:id/roles` - Assign role to user

**Profiles:**
- `GET /api/v1/profiles/me` - Get own profile
- `PATCH /api/v1/profiles/me` - Update own profile
- `GET /api/v1/profiles/:userId` - Get user profile (admin)

**Roles & Permissions:**
- `GET /api/v1/roles` - List all roles
- `GET /api/v1/permissions` - List all permissions
- `POST /api/v1/roles/:id/permissions` - Assign permission to role

**Audit:**
- `GET /api/v1/audit` - Get audit logs (SUPER_ADMIN only)

## 🧪 Testing

### Test Registration Flow

1. Go to http://localhost:3000
2. Click "Sign up"
3. Fill in the registration form
4. Check MailHog at http://localhost:8026 for verification email
5. Click the verification link
6. Login with your credentials

### Test OTP Flow

1. Login as any seed user
2. If OTP is enabled, you'll be prompted for a code
3. Check MailHog for the 6-digit OTP code
4. Enter the code to complete login

### Test OAuth (requires configuration)

1. Set up Google/GitHub OAuth credentials (see Configuration section)
2. Click "Continue with Google" or "Continue with GitHub"
3. Complete OAuth flow
4. Account will be created/linked automatically

## 🛠️ Development (Local)

### API Development

```bash
cd api
npm install

# Copy environment file
cp .env.example .env

# Start dependencies only (via Docker)
docker-compose up postgres redis minio mailhog -d

# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed database
npm run seed

# Start dev server with hot reload
npm run start:dev

# Run tests
npm run test
npm run test:e2e

# Lint & format
npm run lint
npm run format
```

### Web Development

```bash
cd web
npm install

# Copy environment file
cp .env.example .env

# Start dev server
npm run dev

# Build for production
npm run build
npm run start

# Lint & format
npm run lint
npm run lint -- --fix
```

## 🔧 Configuration

### Environment Variables

**API (.env):**
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/8care?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (min 32 chars for production)
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d

# OAuth (leave empty for development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:4000/api/v1/auth/github/callback

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=8care-avatars

# Email (MailHog for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@8care.ai

# Frontend URL (for emails)
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# Security
ENCRYPTION_KEY=your-super-secret-encryption-key-change-in-production-min32chars

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_TTL=900
RATE_LIMIT_AUTH_MAX=5

# OTP
OTP_EXPIRATION_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Logging
LOG_LEVEL=debug

# Database Seeding
SEED_DATA=true
```

**Web (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

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

## 📁 Project Structure

```
8care/
├── api/                    # NestJS Backend
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # Users module
│   │   ├── roles/         # Roles & permissions
│   │   ├── profiles/      # User profiles
│   │   ├── audit/         # Audit logging
│   │   ├── storage/       # File uploads (MinIO)
│   │   ├── mail/          # Email service
│   │   ├── database/      # Prisma service
│   │   ├── config/        # Configuration
│   │   └── common/        # Shared utilities
│   ├── prisma/            # Database schema & migrations
│   │   ├── schema.prisma  # Prisma schema
│   │   ├── migrations/    # Database migrations
│   │   └── seed.ts        # Seed data script
│   ├── test/              # Integration tests
│   ├── Dockerfile         # Multi-stage Docker build
│   └── package.json
├── web/                    # Next.js Frontend
│   ├── app/               # App Router pages
│   │   ├── (auth)/        # Auth pages (login, register, etc.)
│   │   ├── (dashboard)/   # Protected dashboard pages
│   │   └── page.tsx       # Root page with smart redirect
│   ├── components/        # React components
│   │   ├── ui/            # shadcn/ui components
│   │   └── layout/        # Layout components
│   ├── lib/               # Utilities & API client
│   │   ├── api/           # API client functions
│   │   ├── constants/     # Constants
│   │   └── validations/   # Zod schemas
│   ├── hooks/             # Custom hooks
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   ├── Dockerfile         # Multi-stage Docker build
│   └── package.json
├── docker-compose.yml      # Docker orchestration
├── PLAN.md                 # Detailed execution plan
└── README.md               # This file
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check which process is using the port
lsof -ti:3000
lsof -ti:4000

# Kill the process
kill -9 <PID>

# Or stop Docker containers
docker-compose down
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

### API Not Starting (EBUSY error)

This was fixed by adding `.dockerignore` to exclude the `dist` folder. If you still encounter it:

```bash
# Remove local dist folder
rm -rf api/dist

# Rebuild
docker-compose down -v
docker-compose up --build
```

### MinIO Bucket Not Created

```bash
# Manually create bucket
docker exec -it 8care-minio-init sh
mc alias set minio http://minio:9000 minioadmin minioadmin123
mc mb minio/8care-avatars
mc anonymous set public minio/8care-avatars
```

### Web App Shows Blank Page

```bash
# Check web logs
docker-compose logs web

# Rebuild web container
docker-compose up --build web
```

### Email Not Sending

Check MailHog UI at http://localhost:8026 to see captured emails.

## 📊 Architecture Decisions

### Why Multi-Repo Structure?

- **Separation of concerns**: Clear boundaries between frontend and backend
- **Independent scaling**: Deploy API and Web separately
- **Technology flexibility**: Different tech stacks can evolve independently
- **Team organization**: Different teams can own different repos

### Why JWT in httpOnly Cookies?

- **Security**: Protected from XSS attacks
- **Automatic**: Browser handles cookie management
- **Refresh tokens**: 30-day sessions with automatic refresh
- **Logout**: Clear cookies on logout

### Why Zod for Validation?

- **Type safety**: Automatic TypeScript inference
- **Shared schemas**: Same validation on frontend and backend
- **Runtime safety**: Validate external data at runtime
- **Developer experience**: Clear error messages

### Why Zustand for State Management?

- **Simplicity**: Less boilerplate than Redux
- **Performance**: No unnecessary re-renders
- **Persistence**: Easy localStorage integration
- **TypeScript**: Excellent TypeScript support

### Why Prisma ORM?

- **Type safety**: Auto-generated TypeScript types
- **Migrations**: Database version control
- **Developer experience**: Great DX with IntelliSense
- **Performance**: Optimized queries

### Why Email-Based OTP (Not TOTP)?

- **Accessibility**: No app required
- **Simplicity**: Users understand email
- **Redis caching**: Fast, expiring codes
- **Flexibility**: Can be enhanced to SMS later

## 🔒 Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT tokens with expiration
- ✅ Refresh token rotation
- ✅ httpOnly cookies (XSS protection)
- ✅ Rate limiting (auth endpoints)
- ✅ Email verification required
- ✅ Optional OTP 2FA
- ✅ Password complexity requirements
- ✅ Audit logging for all actions
- ✅ CORS configuration
- ✅ Input validation with Zod
- ✅ SQL injection protection (Prisma)

## 📝 API Response Format

**Success:**
```json
{
  "data": { ... },
  "message": "Success message"
}
```

**Error:**
```json
{
  "statusCode": 400,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "timestamp": "2025-10-29T01:49:37.095Z",
  "path": "/api/v1/auth/register",
  "correlationId": "uuid"
}
```

**Paginated:**
```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## 🚀 Deployment

### Production Checklist

- [ ] Change all JWT secrets (min 32 characters)
- [ ] Change encryption key (min 32 characters)
- [ ] Set up real SMTP server (replace MailHog)
- [ ] Configure OAuth credentials (Google, GitHub)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Set up monitoring & alerts
- [ ] Review rate limiting settings
- [ ] Update MinIO credentials
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start in production mode
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support

For questions or issues:
- Check the troubleshooting section above
- Review the API documentation at `/api/docs`
- Check Docker logs: `docker-compose logs <service>`

## 📄 License

This project is part of a technical assessment for 8Care.

---

**Built with ❤️ using modern best practices and industry standards.**

No semicolons were harmed in the making of this application.
