# 8Care Full-Stack Technical Test - Execution Plan

## Project Overview
Multi-repo architecture with NestJS API and Next.js frontend, featuring role-based access control, OAuth SSO, OTP authentication, and comprehensive audit logging.

**Key Technologies:**
- Backend: NestJS, Prisma, PostgreSQL, Redis, MinIO, MailHog
- Frontend: Next.js (App Router), shadcn/ui, Radix, TailwindCSS, Zustand, React Hook Form
- Validation: Zod (both backend and frontend)
- Testing: Jest (backend integration), Vitest (frontend)
- DevOps: Docker Compose, GitHub Actions
- Documentation: OpenAPI/Swagger, ADRs

---

## Phase 1: Infrastructure & Project Setup

### 1.1 Repository Structure
- **API Repository** (`8care-api`)
  - NestJS monolithic structure with modular architecture
  - Organized by feature modules (auth, users, roles, permissions, audit, storage)
  - Shared utilities, types, and constants in dedicated folders
  - Test files colocated with source files

- **Web Repository** (`8care-web`)
  - Next.js App Router structure
  - Feature-based organization (app/, components/, lib/, hooks/, stores/)
  - Shared UI components in components/ui (shadcn/ui)
  - Server actions and API clients separated

### 1.2 Docker Infrastructure
- **docker-compose.yml** with services:
  - **postgres**: PostgreSQL 18 with persistent volume, health checks
  - **redis**: Redis 8.2 for OTP storage and session caching
  - **minio**: S3-compatible storage for file uploads, exposed API and Console
  - **mailhog**: Email testing server with SMTP (1025) and UI (8025)
  - **api**: NestJS container with hot-reload in dev, optimized build in prod
  - **web**: Next.js container with Turbopack, exposed on port 3000
  - **Network**: Custom bridge network for inter-service communication
  - **Volumes**: Named volumes for DB persistence, MinIO data, uploads

### 1.3 Environment Configuration
- **.env.example** templates for both repos
- **Validation schema** using Zod for all environment variables
- **Fallback values** for development (secure defaults for production)
- **Secrets management**: Document generation of JWT secrets, OAuth credentials
- **Variables include**:
  - Database connection strings
  - Redis URL
  - JWT access/refresh secrets and expiration times
  - OAuth client IDs and secrets (Google, GitHub)
  - MinIO credentials and endpoints
  - SMTP settings for MailHog
  - Frontend API URL
  - CORS origins

---

## Phase 2: Database Architecture & Prisma Setup

### 2.1 Database Schema Design

**Core Tables:**

**users**
- id (UUID, primary key)
- email (unique, indexed)
- password_hash (nullable for SSO-only users)
- email_verified (boolean, default false)
- email_verified_at (timestamp, nullable)
- is_active (boolean, default true)
- is_otp_enabled (boolean, default false)
- otp_secret (encrypted, nullable)
- created_at, updated_at, deleted_at (soft delete)

**roles**
- id (UUID, primary key)
- name (enum: SUPER_ADMIN, COORDINATOR, CAREGIVER, PATIENT)
- description
- is_system_role (boolean, prevents deletion)
- created_at, updated_at

**permissions**
- id (UUID, primary key)
- resource (string, e.g., "users", "profiles")
- action (string, e.g., "create", "read", "update", "delete")
- description
- created_at, updated_at

**role_permissions** (junction table)
- role_id (FK to roles)
- permission_id (FK to permissions)
- created_at

**user_roles** (junction table)
- user_id (FK to users)
- role_id (FK to roles)
- assigned_by (FK to users, nullable)
- assigned_at

**profiles**
- id (UUID, primary key)
- user_id (FK to users, unique)
- first_name, last_name
- phone (nullable)
- avatar_url (nullable, MinIO reference)
- address (nullable)
- date_of_birth (nullable)
- created_at, updated_at

**caregiver_profiles**
- id (UUID, primary key)
- profile_id (FK to profiles, unique)
- license_number (nullable)
- specialization (nullable)
- years_of_experience (integer, nullable)
- availability_status (enum)
- created_at, updated_at

**patient_profiles**
- id (UUID, primary key)
- profile_id (FK to profiles, unique)
- medical_record_number (nullable)
- emergency_contact_name (nullable)
- emergency_contact_phone (nullable)
- allergies (text, nullable)
- medical_conditions (text, nullable)
- created_at, updated_at

**coordinator_profiles**
- id (UUID, primary key)
- profile_id (FK to profiles, unique)
- department (nullable)
- employee_id (nullable)
- created_at, updated_at

**auth_providers** (for SSO)
- id (UUID, primary key)
- user_id (FK to users)
- provider (enum: GOOGLE, GITHUB, LOCAL)
- provider_user_id (string, indexed)
- access_token (encrypted, nullable)
- refresh_token (encrypted, nullable)
- linked_at
- unique constraint on (provider, provider_user_id)

**refresh_tokens**
- id (UUID, primary key)
- user_id (FK to users, indexed)
- token_hash (string, unique)
- expires_at (timestamp, indexed)
- created_at
- revoked_at (nullable)
- replaced_by_token_id (FK self-reference, nullable)

**email_verification_tokens**
- id (UUID, primary key)
- user_id (FK to users)
- token_hash (string, unique, indexed)
- expires_at (timestamp, indexed)
- created_at
- used_at (nullable)

**password_reset_tokens**
- id (UUID, primary key)
- user_id (FK to users)
- token_hash (string, unique, indexed)
- expires_at (timestamp, indexed)
- created_at
- used_at (nullable)

**audit_logs**
- id (UUID, primary key)
- user_id (FK to users, nullable for system actions)
- action (string, indexed, e.g., "user.login", "role.assigned")
- resource_type (string, e.g., "user", "role")
- resource_id (string, nullable)
- ip_address (inet type)
- user_agent (text)
- metadata (JSONB, for flexible additional data)
- status (enum: SUCCESS, FAILURE, PENDING)
- created_at (indexed)

**user_backup_codes** (for OTP recovery)
- id (UUID, primary key)
- user_id (FK to users)
- code_hash (string)
- used_at (nullable)
- created_at

### 2.2 Prisma Configuration
- **Multi-schema support**: Consider separate schemas for auth, users, audit
- **Indexes**: Strategic indexing on frequently queried fields (email, tokens, audit created_at)
- **Migrations**: Version-controlled migration files
- **Seed script**: Create all four roles, one user per role, basic permissions
- **Soft deletes**: Implement middleware for deleted_at filtering
- **JSON fields**: Use for flexible metadata in audit logs
- **Encryption**: Use Prisma middleware for encrypting sensitive fields (OTP secrets, tokens)

### 2.3 Seed Data Strategy
- **Roles**: SUPER_ADMIN, COORDINATOR, CAREGIVER, PATIENT with descriptions
- **Permissions**: Comprehensive permission matrix:
  - SUPER_ADMIN: All permissions
  - COORDINATOR: Read/update caregivers and patients
  - CAREGIVER: Read/update own profile
  - PATIENT: Read/update own profile
- **Users**: One per role with verified emails:
  - superadmin@8care.ai (password: SuperAdmin123!)
  - coordinator@8care.ai (password: Coordinator123!)
  - caregiver@8care.ai (password: Caregiver123!)
  - patient@8care.ai (password: Patient123!)
- **Profiles**: Complete profile data with role-specific fields
- **Idempotent**: Seed script should be runnable multiple times safely

---

## Phase 3: NestJS API Architecture

### 3.1 Core Module Structure

**AuthModule**
- Authentication strategies (Local, JWT, Google OAuth, GitHub OAuth)
- Guards (JwtAuthGuard, RolesGuard, PermissionsGuard, OptionalAuthGuard)
- Services: AuthService, TokenService, OTPService, EmailVerificationService
- Controllers: AuthController (/api/v1/auth)
- DTOs with Zod validation: LoginDto, RegisterDto, RefreshTokenDto, VerifyOTPDto

**UsersModule**
- CRUD operations with role-based filtering
- Services: UsersService, ProfilesService
- Controllers: UsersController (/api/v1/users), ProfilesController (/api/v1/profiles)
- DTOs: CreateUserDto, UpdateUserDto, UpdateProfileDto, QueryUsersDto
- Relationships handling (profiles, roles)

**RolesModule**
- Role and permission management
- Services: RolesService, PermissionsService
- Controllers: RolesController (/api/v1/roles), PermissionsController (/api/v1/permissions)
- CRUD with safeguards against deleting system roles
- DTOs: AssignRoleDto, CreatePermissionDto

**AuditModule**
- Comprehensive audit logging
- Services: AuditService (async logging via queue)
- Controllers: AuditController (/api/v1/audit) - read-only for SUPER_ADMIN
- Decorator: @AuditLog() for automatic action tracking
- Query capabilities: filter by user, action, date range, resource

**StorageModule**
- File upload handling via MinIO
- Services: StorageService (presigned URLs, upload/download)
- Controllers: StorageController (/api/v1/storage)
- Validation: File type, size limits
- Integration with profiles for avatar uploads

**MailModule**
- Email sending abstraction
- Services: MailService (templates for verification, OTP, password reset)
- Template engine: Handlebars or EJS for HTML emails
- Configuration for MailHog in development, SMTP in production

**ConfigModule**
- Centralized configuration with validation
- Zod schemas for env vars
- Typed config service injection

**DatabaseModule**
- Prisma service wrapper
- Connection management
- Middleware for soft deletes, encryption

**LoggingModule**
- Structured logging with Pino
- Request correlation IDs
- Log levels per environment
- Integration with audit logging

**RateLimitModule**
- Throttler configuration
- Per-endpoint rate limits
- Redis storage for distributed rate limiting
- Custom decorators: @RateLimit(), @SkipThrottle()

### 3.2 Authentication Flow Design

**Registration Flow:**
1. User submits email, password, role (if allowed), profile data
2. Validate email uniqueness, password strength
3. Hash password with bcrypt (cost factor 12)
4. Create user record (email_verified = false)
5. Create profile with role-specific table
6. Generate email verification token (UUID, 24h expiry)
7. Store token hash in database
8. Send verification email via MailHog
9. Return success message (no auto-login)

**Email Verification Flow:**
1. User clicks link with token
2. Validate token existence and expiration
3. Mark user.email_verified = true, set email_verified_at
4. Update token.used_at
5. Allow login

**Login Flow (Local):**
1. User submits email + password
2. Find user by email, check is_active and email_verified
3. Verify password with bcrypt
4. Check if OTP is enabled for user
5. If OTP enabled:
   - Generate 6-digit OTP code
   - Store in Redis with 5-minute expiry (key: `otp:{userId}`, value: hashed code)
   - Send OTP via email
   - Return partial token (short-lived, 5min, claims: {userId, otpPending: true})
6. If OTP disabled:
   - Generate access token (15min expiry, claims: {userId, email, roles, permissions})
   - Generate refresh token (30 days expiry)
   - Hash and store refresh token in database
   - Set httpOnly cookie with refresh token
   - Log audit event (user.login.success)
   - Return access token + user data

**OTP Verification Flow:**
1. User submits OTP code + partial token
2. Validate partial token, extract userId
3. Retrieve OTP from Redis, compare hashed values
4. If valid:
   - Delete OTP from Redis
   - Generate full access + refresh tokens
   - Set httpOnly cookie
   - Log audit event
   - Return access token + user data
5. If invalid:
   - Track failed attempts (max 3)
   - Log audit event (user.otp.failed)
   - After 3 failures, delete OTP and require re-login

**OAuth Flow (Google/GitHub):**
1. User clicks "Sign in with Google/GitHub"
2. Redirect to OAuth provider with callback URL
3. Provider redirects back with authorization code
4. Exchange code for access token
5. Fetch user profile from provider
6. Check if auth_provider record exists (by provider + provider_user_id)
7. If exists:
   - Get linked user
   - Generate tokens
   - Return access token + user data
8. If not exists:
   - Check if user with email exists
   - If email exists and email_verified:
     - Link provider to existing user
     - Create auth_provider record
     - Generate tokens
   - If email doesn't exist:
     - Create new user (email_verified = true for OAuth)
     - Create default profile
     - Assign default role (PATIENT or based on invite)
     - Create auth_provider record
     - Generate tokens
9. Store/update provider tokens (encrypted)
10. Log audit event
11. Return access token + user data

**Refresh Token Flow:**
1. Access token expires (15min)
2. Frontend automatically calls /auth/refresh with httpOnly cookie
3. Validate refresh token from cookie
4. Check token in database (not revoked, not expired)
5. If valid:
   - Generate new access token
   - Optionally rotate refresh token (for enhanced security)
   - If rotated, mark old token as replaced, store new token
   - Update cookie
   - Return new access token
6. If invalid:
   - Clear cookie
   - Return 401
   - Frontend redirects to login

**Logout Flow:**
1. User clicks logout
2. Frontend calls /auth/logout with refresh token
3. Mark refresh token as revoked in database
4. Clear httpOnly cookie
5. Log audit event
6. Frontend clears access token from memory

**Password Reset Flow:**
1. User submits email on forgot password page
2. Find user by email
3. Generate password reset token (UUID, 1h expiry)
4. Store token hash in database
5. Send reset email with link
6. User clicks link, submits new password
7. Validate token, check expiration
8. Hash new password
9. Update user password
10. Revoke all refresh tokens for user
11. Mark reset token as used
12. Send confirmation email
13. Log audit event

### 3.3 Authorization Strategy

**Guards Implementation:**

**JwtAuthGuard:**
- Extends Passport JWT strategy
- Validates access token from Authorization header
- Extracts user payload (userId, email, roles, permissions)
- Attaches to request.user
- Returns 401 if token invalid/expired

**RolesGuard:**
- Reads required roles from @Roles() decorator metadata
- Checks if request.user.roles includes any required role
- Returns 403 if unauthorized
- Executed after JwtAuthGuard

**PermissionsGuard:**
- Reads required permissions from @RequirePermissions() decorator
- Checks if request.user.permissions includes all required permissions
- Supports complex permission checks (e.g., "users.update:own" for self-updates)
- Returns 403 if unauthorized
- Executed after JwtAuthGuard

**OptionalAuthGuard:**
- Allows both authenticated and unauthenticated requests
- Attaches user if token present and valid
- Used for endpoints that change behavior based on auth state

**Implementation Pattern:**
- Use @UseGuards(JwtAuthGuard, RolesGuard) on controllers/methods
- Combine with decorators: @Roles('SUPER_ADMIN', 'COORDINATOR')
- Custom decorator for current user: @CurrentUser()
- Resource ownership checking in service layer (e.g., user can only update own profile)

### 3.4 Validation & Error Handling

**Zod Integration:**
- Create Zod schemas for all DTOs
- Custom pipe: ZodValidationPipe to transform and validate
- Use .transform() for data sanitization (trim strings, lowercase emails)
- Use .refine() for complex validations (password confirmation match)
- Generate TypeScript types from schemas for consistency

**Global Exception Filter:**
- Catch all exceptions
- Format consistent error responses:
  ```json
  {
    "statusCode": 400,
    "message": "Validation failed",
    "errors": [...],
    "timestamp": "2025-01-15T10:30:00Z",
    "path": "/api/v1/users",
    "correlationId": "uuid"
  }
  ```
- Log errors with correlation ID
- Different handling for HttpException, PrismaClientKnownRequestError, ZodError
- Hide sensitive info in production

**Custom Exceptions:**
- UserNotFoundException
- InvalidCredentialsException
- EmailNotVerifiedException
- OTPRequiredException
- InsufficientPermissionsException
- TokenExpiredException

**Validation Pipes:**
- Global ValidationPipe with transform: true
- Whitelist: true (strip unknown properties)
- ForbidNonWhitelisted: true (error on extra properties)

### 3.5 API Documentation (OpenAPI/Swagger)

**Configuration:**
- @nestjs/swagger package
- Swagger UI at /api/docs
- JSON spec at /api/docs-json
- Document all endpoints with @ApiTags, @ApiOperation, @ApiResponse
- Schema generation from DTOs with @ApiProperty decorators
- Security definitions for JWT Bearer tokens
- Examples for request/response bodies
- Group endpoints by tags (Auth, Users, Roles, Audit, etc.)

**Documentation Standards:**
- All DTOs fully annotated
- Success and error responses documented
- Required permissions noted in descriptions
- Rate limit info in operation descriptions
- Deprecated endpoints marked with @ApiDeprecated

### 3.6 Rate Limiting Strategy

**Configuration:**
- @nestjs/throttler with Redis storage
- Global limits: 100 requests per minute per IP
- Auth endpoint limits (override global):
  - POST /auth/login: 5 per 15 minutes per IP
  - POST /auth/register: 3 per hour per IP
  - POST /auth/otp/send: 3 per 5 minutes per user
  - POST /auth/otp/verify: 5 per 5 minutes per user
  - POST /auth/password/reset-request: 3 per hour per email
- User-based limits after authentication (user ID instead of IP)
- Custom decorator to adjust limits: @RateLimit({ ttl: 60, limit: 10 })

**Redis Storage:**
- Keys: `throttle:{IP/userId}:{endpoint}:{timestamp}`
- TTL matches rate limit window
- Distributed rate limiting for multi-instance deployments

### 3.7 Health Checks

**Endpoints:**
- GET /health: Basic liveness check (returns 200 OK)
- GET /health/ready: Readiness check
  - Check Prisma connection (simple query)
  - Check Redis connection (ping)
  - Check MinIO connection (bucket exists)
  - Return 200 if all healthy, 503 if any fail
- Used by Docker healthcheck and Kubernetes probes

---

## Phase 4: Next.js Frontend Architecture

### 4.1 Project Structure

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   ├── verify-email/
│   ├── forgot-password/
│   └── reset-password/
├── (dashboard)/
│   ├── layout.tsx (protected layout with auth check)
│   ├── dashboard/
│   ├── users/
│   ├── profile/
│   └── settings/
├── api/ (route handlers if needed)
├── layout.tsx (root layout)
└── page.tsx (landing/redirect)

components/
├── ui/ (shadcn/ui components)
├── forms/ (reusable form components)
├── layout/ (Header, Sidebar, Footer)
├── dashboard/ (dashboard-specific components)
└── providers/ (Zustand, TanStack Query providers)

lib/
├── api/ (API client functions)
├── auth/ (auth utilities, token management)
├── utils/ (shared utilities, cn helper)
├── validations/ (Zod schemas for forms)
└── constants/

hooks/
├── use-auth.ts
├── use-user.ts
├── use-permissions.ts
└── use-form-with-zod.ts

stores/
├── auth-store.ts (Zustand)
└── ui-store.ts (theme, sidebar state)

types/
├── api.ts (API response types)
├── auth.ts
└── user.ts
```

### 4.2 Authentication Client Architecture

**Auth Store (Zustand):**
```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email, password) => Promise<void>
  loginWithOTP: (code, partialToken) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithGitHub: () => Promise<void>
  register: (data) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<void>
  enableOTP: () => Promise<void>
  disableOTP: () => Promise<void>
}
```

**Token Management:**
- Access token stored in Zustand (memory only)
- Refresh token in httpOnly cookie (handled by browser)
- Auto-refresh logic: Axios interceptor detects 401, calls refresh endpoint
- On successful refresh, retry original request
- On refresh failure, clear auth state and redirect to login

**Protected Route Pattern:**
- Server Component checks auth in layout
- Redirect to /login if not authenticated
- Check permissions for specific routes (e.g., /users only for SUPER_ADMIN, COORDINATOR)
- Show 403 page if insufficient permissions

**API Client:**
- Axios instance with base URL
- Request interceptor: Add Authorization header with access token
- Response interceptor: Handle 401 (refresh token), 403 (show error), 429 (rate limit message)
- Typed API functions: loginAPI, registerAPI, getUsersAPI, etc.
- Error handling utilities

### 4.3 Form Handling with React Hook Form + Zod

**Pattern:**
```typescript
// 1. Define Zod schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

// 2. Use with React Hook Form
const form = useForm({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' }
})

// 3. Submit handler
const onSubmit = async (data) => {
  await authStore.login(data.email, data.password)
}
```

**Shared Form Components:**
- FormField with shadcn/ui Input
- FormSelect for dropdowns
- FormCheckbox, FormRadio
- FormDatePicker
- FormFileUpload (for avatars)
- All with error display and accessibility

**Validation Schemas:**
- Reuse Zod schemas across client and server (shared types package possible)
- Client-side validation for UX, server-side for security
- Custom validators: passwordStrength, uniqueEmail (async), phoneNumber

### 4.4 Role-Based UI & Navigation

**Dynamic Sidebar:**
- Menu items filtered by user roles/permissions
- SUPER_ADMIN sees: Dashboard, Users, Roles, Audit Logs, Profile, Settings
- COORDINATOR sees: Dashboard, Users (filtered), Profile, Settings
- CAREGIVER sees: Dashboard, My Profile, Settings
- PATIENT sees: Dashboard, My Profile, Settings

**Permission-Based Components:**
- `<CanAccess permission="users.create">` wrapper component
- Checks user permissions from auth store
- Hides/disables UI elements based on permissions
- Example: Edit button only visible if user has "users.update" permission

**Dashboard Views:**
- SUPER_ADMIN: Stats (total users, recent activities), user management table
- COORDINATOR: Caregiver and patient lists with filters
- CAREGIVER: Own profile summary, upcoming tasks/patients (placeholder)
- PATIENT: Own profile summary, caregiver info (placeholder)

### 4.5 User Management Interface

**Users List (SUPER_ADMIN, COORDINATOR):**
- Table with columns: Avatar, Name, Email, Role, Status, Actions
- Filters: Role (multi-select), Status (active/inactive), Search (name/email)
- Pagination (20 per page)
- Sort by: Name, Email, Created Date
- Actions: View, Edit (modal), Delete (confirmation), Assign Role

**User Detail Modal:**
- Tabs: Profile, Roles & Permissions, Activity Log (audit logs for this user)
- Profile tab: Editable fields based on permissions, avatar upload
- Roles tab: Assign/remove roles (checkboxes), show permissions inherited
- Activity tab: Recent audit logs (read-only)

**Create User Form:**
- Fields: Email, First Name, Last Name, Role, Send Welcome Email (checkbox)
- Password: Auto-generated or manual (with strength meter)
- Role-specific fields appear based on selected role
- Validation with Zod schema
- Success message with option to create another

**Profile Page (Own Profile):**
- Avatar upload with preview
- Editable fields: Name, Phone, Address, DOB
- Role-specific fields (e.g., CAREGIVER shows license number, specialization)
- Password change section (current password, new password, confirm)
- Enable/Disable OTP section (show QR code for TOTP setup, verify code)
- Connected accounts section (Google, GitHub) with link/unlink buttons

### 4.6 Accessibility Implementation (WCAG 2.1 AA)

**Keyboard Navigation:**
- All interactive elements focusable with Tab
- Logical tab order (forms, menus, modals)
- Focus visible indicator (outline ring from Tailwind)
- Skip to content link
- Modal traps focus, Esc to close
- Dropdown menus navigable with arrow keys

**Screen Reader Support:**
- Semantic HTML (nav, main, aside, article)
- ARIA labels on icon buttons
- ARIA live regions for dynamic content (form errors, notifications)
- ARIA attributes from Radix primitives
- Alt text on all images (avatars, logos)
- Form labels properly associated with inputs

**Visual Accessibility:**
- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- Focus indicators visible with sufficient contrast
- Text resizable up to 200% without loss of functionality
- No information conveyed by color alone (icons + text)
- Error messages with icons, not just red color

**Form Accessibility:**
- Labels for all inputs
- Required fields marked with asterisk and aria-required
- Error messages associated with inputs via aria-describedby
- Success/error announcements via aria-live
- Autocomplete attributes (email, name, address)

**Component Accessibility (shadcn/ui + Radix):**
- Dialog: Focus trap, Esc to close, aria-labelledby, aria-describedby
- Dropdown: Keyboard navigation, aria-expanded, aria-haspopup
- Tabs: Arrow key navigation, aria-selected, role="tablist"
- Toast/Notifications: aria-live="polite", dismissible

### 4.7 File Upload (Avatars)

**Flow:**
1. User selects file in profile page
2. Client validates: type (jpg, png, webp), size (<5MB)
3. Show preview with crop tool (react-easy-crop)
4. On save, convert to blob
5. Call API: POST /api/v1/storage/upload with multipart/form-data
6. API uploads to MinIO, returns URL
7. Call API: PATCH /api/v1/profiles with avatar_url
8. Update local state and UI

**MinIO Integration:**
- Bucket: `8care-avatars`
- Presigned URLs for secure access (1h expiry)
- API generates presigned GET URLs when serving avatar_url
- Client displays avatar with presigned URL

---

## Phase 5: Testing Strategy

### 5.1 Backend Integration Tests (NestJS)

**Test Setup:**
- Separate test database (PostgreSQL container or in-memory)
- Test fixtures with factory functions (e.g., createTestUser, createTestRole)
- Global setup: Migrate DB, seed minimal data
- Global teardown: Clean up database
- Use Supertest for HTTP requests
- Use @nestjs/testing for module initialization

**Test Coverage:**

**Auth Module Tests:**
- Registration: Valid data, duplicate email, weak password, missing fields
- Email verification: Valid token, expired token, invalid token
- Login: Valid credentials, invalid credentials, unverified email, inactive user
- OTP: Send OTP, verify OTP, invalid OTP, expired OTP, max attempts
- OAuth: Mock Google/GitHub responses, new user, existing user, link accounts
- Refresh token: Valid token, expired token, revoked token, rotation
- Logout: Revoke token, invalid token
- Password reset: Request, valid reset, expired token

**Users Module Tests:**
- CRUD operations with different roles
- Filtering: By role, by status, search
- Pagination and sorting
- Permission checks: COORDINATOR can't see SUPER_ADMIN
- Profile updates with role-specific fields
- Soft delete

**Roles & Permissions Tests:**
- Assign role to user
- Remove role from user
- Prevent deleting system roles
- Permission checks work correctly

**Audit Module Tests:**
- Logs are created for key actions
- Query audit logs by user, date, action
- Sensitive data not logged

**Storage Module Tests:**
- File upload: Valid file, invalid type, size limit exceeded
- MinIO integration (mock or real container)
- Presigned URL generation

**Rate Limiting Tests:**
- Respect limits (auth endpoints)
- Return 429 when exceeded
- Reset after TTL

### 5.2 Frontend Integration Tests (Next.js)

**Test Setup:**
- Vitest + React Testing Library
- MSW (Mock Service Worker) for API mocking
- Mock Zustand store
- Test fixtures for user data

**Test Coverage:**

**Authentication Tests:**
- Login form: Valid submission, validation errors, API error handling
- Register form: Valid submission, password strength indicator, validation
- OTP flow: Input OTP code, verify, resend
- OAuth buttons: Redirect to provider

**Protected Routes:**
- Redirect to login when not authenticated
- Show content when authenticated
- Permission checks (403 page)

**User Management:**
- Display users list with filters
- Create user modal: Submit form, validation
- Edit user: Update profile, assign roles
- Delete user: Confirmation dialog

**Profile Page:**
- Display user data
- Edit profile: Update fields, avatar upload
- Enable OTP: Show QR, verify setup

**Accessibility Tests:**
- All forms have labels
- Keyboard navigation works
- Focus management in modals
- ARIA attributes present

### 5.3 GitHub Actions CI/CD

**Workflow:**

**API Workflow (`.github/workflows/api.yml`):**
- Trigger: Push to main, PR to main
- Jobs:
  - **lint**: Run ESLint
  - **test**:
    - Start Postgres, Redis, MinIO containers (services)
    - Install dependencies
    - Run Prisma migrations
    - Run Jest tests
    - Upload coverage report
  - **build**: Build Docker image, push to registry (optional)
- Environment variables from secrets

**Web Workflow (`.github/workflows/web.yml`):**
- Trigger: Push to main, PR to main
- Jobs:
  - **lint**: Run ESLint
  - **typecheck**: Run TypeScript compiler (tsc --noEmit)
  - **test**: Run Vitest tests
  - **build**: Next.js build, check for build errors
- Environment variables for API URL (mock)

**Docker Compose Test:**
- Workflow to test full docker-compose build
- Run `docker-compose up --build -d`
- Wait for health checks
- Run smoke tests (e.g., curl endpoints)
- Tear down

---

## Phase 6: Logging & Audit

### 6.1 Structured Logging (Pino)

**Configuration:**
- Pino logger with JSON output
- Log levels: trace, debug, info, warn, error, fatal
- Development: Pretty print with pino-pretty
- Production: JSON logs for aggregation (e.g., ELK stack)
- Correlation ID: Generate UUID per request, attach to all logs in that request

**Request Logging:**
- Middleware to log incoming requests: method, path, IP, user-agent, correlation ID
- Log response: status code, duration
- Don't log sensitive data: passwords, tokens, credit cards

**Error Logging:**
- Log all uncaught exceptions with stack trace
- Include correlation ID for tracing
- Separate error log file or stream

### 6.2 Audit Logging

**What to Log:**
- Authentication events: login, logout, failed login, OTP sent/verified
- Authorization failures: 403 errors with user, resource, action
- User management: create, update, delete, role assignment, permission changes
- Profile updates: what fields changed (before/after)
- Sensitive actions: password resets, email changes, OTP enable/disable
- OAuth linking/unlinking
- File uploads

**Audit Log Structure:**
```json
{
  "id": "uuid",
  "userId": "uuid or null",
  "action": "user.login",
  "resourceType": "user",
  "resourceId": "uuid",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "roleId": "uuid",
    "assignedBy": "uuid"
  },
  "status": "SUCCESS",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Decorator Implementation:**
- Custom decorator @AuditLog(action, resourceType)
- Interceptor extracts user, request details
- After method execution, log to database asynchronously
- Include method result/error in metadata

**Audit Log UI:**
- SUPER_ADMIN only
- Filterable table: user, action, date range, resource type
- Export to CSV for compliance
- Detail modal shows full metadata

---

## Phase 7: Advanced Features

### 7.1 OTP/2FA Implementation Details

**Setup Flow:**
1. User enables OTP in settings
2. Backend generates TOTP secret (otplib library)
3. Encrypt and store in user.otp_secret
4. Generate QR code (qrcode library) with secret and app name
5. Return QR code image to frontend
6. User scans with authenticator app (Google Authenticator, Authy)
7. User enters code to verify setup
8. Backend verifies code against secret
9. On success, set user.is_otp_enabled = true
10. Generate backup codes (10 codes, one-time use, hashed)
11. Display backup codes to user (store securely)

**Login with OTP:**
- After password verification, check user.is_otp_enabled
- If true, generate 6-digit code (random, 5min expiry)
- Store in Redis: `otp:{userId}` → hashed code
- Send code via email (future: support SMS)
- Return partial token to frontend
- Frontend shows OTP input page
- User submits code, backend verifies against Redis
- On success, issue full tokens

**Backup Codes:**
- Used if user loses authenticator
- Table: user_backup_codes (user_id, code_hash, used_at)
- Allow using backup code in place of OTP
- Mark as used after successful login
- Warn user to regenerate after using backup code

### 7.2 OAuth SSO Deep Dive

**Google OAuth:**
- Use Passport Google OAuth20 strategy
- Scopes: email, profile
- Callback URL: /api/v1/auth/google/callback
- Exchange code for access token
- Fetch user profile: email, name, picture
- Link or create user as described in OAuth flow
- Store provider access token (encrypted) for future API calls (optional)

**GitHub OAuth:**
- Use Passport GitHub strategy
- Scopes: user:email, read:user
- Callback URL: /api/v1/auth/github/callback
- Exchange code for access token
- Fetch user profile: email, name, avatar_url
- GitHub doesn't always provide email; fetch from /user/emails API
- Link or create user

**Account Linking:**
- If user logs in with OAuth and email matches existing user:
  - Require existing user to be email_verified
  - Create auth_provider record linking provider to user
  - Allow user to unlink later in settings
- If email doesn't match:
  - Create new user with OAuth email (verified by provider)
- Allow user to link multiple providers to same account

**Security Considerations:**
- Verify OAuth state parameter to prevent CSRF
- Use HTTPS for all OAuth redirects
- Store provider tokens encrypted
- Refresh provider tokens if needed for API calls
- Allow user to revoke provider access

### 7.3 Email Verification Details

**Verification Email:**
- Template: Welcome message, verify button/link
- Link format: https://app.8care.com/verify-email?token={token}
- Token: UUID, hashed in database
- Expiry: 24 hours
- If expired, provide "Resend verification email" button

**Resend Logic:**
- Invalidate previous token
- Generate new token
- Send new email
- Rate limit: 3 per hour per user

**Verification Page:**
- Auto-submit on page load (extract token from URL)
- Show success message, redirect to login
- Show error if token invalid/expired

### 7.4 Password Security

**Strength Meter:**
- Use zxcvbn library on frontend and backend
- Display visual meter (weak, fair, good, strong)
- Require score ≥ 2 (good)
- Show suggestions (e.g., "add symbols", "longer")

**Hashing:**
- bcrypt with cost factor 12
- Salt generated per password (bcrypt handles internally)
- Never store plaintext passwords
- Never log passwords (mask in request logs)

**Password Policies:**
- Minimum 8 characters (enforce 10+ for production)
- Check against common passwords list (top 10k)
- Check against Have I Been Pwned API (optional, breach detection)
- No password history for now (can add later)

---

## Phase 8: Docker & Deployment

### 8.1 Docker Compose Configuration

**Services:**

**postgres:**
- Image: postgres:alpine (PostgreSQL 18)
- Environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- Volumes: postgres_data:/var/lib/postgresql/data
- Ports: 5432:5432
- Healthcheck: pg_isready command
- Networks: 8care-network

**redis:**
- Image: redis:alpine (Redis 8.2)
- Command: redis-server --requirepass {password}
- Volumes: redis_data:/data
- Ports: 6379:6379
- Healthcheck: redis-cli ping
- Networks: 8care-network

**minio:**
- Image: minio/minio:latest
- Command: server /data --console-address ":9001"
- Environment: MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
- Volumes: minio_data:/data
- Ports: 9000:9000 (API), 9001:9001 (Console)
- Healthcheck: curl -f http://localhost:9000/minio/health/live
- Networks: 8care-network
- Init script: Create bucket `8care-avatars` on startup

**mailhog:**
- Image: mailhog/mailhog:latest
- Ports: 1025:1025 (SMTP), 8025:8025 (Web UI)
- Networks: 8care-network

**api:**
- Build: ./api (Dockerfile in API repo)
- Depends on: postgres, redis, minio, mailhog
- Environment: .env file variables
- Ports: 4000:4000
- Volumes: ./api:/app (for hot-reload in dev), /app/node_modules (exclude)
- Command: npm run start:dev (development), npm run start:prod (production)
- Healthcheck: curl -f http://localhost:4000/health
- Networks: 8care-network
- Restart: unless-stopped

**web:**
- Build: ./web (Dockerfile in web repo)
- Depends on: api
- Environment: NEXT_PUBLIC_API_URL=http://api:4000
- Ports: 3000:3000
- Volumes: ./web:/app, /app/node_modules, /app/.next
- Command: npm run dev (development), npm run start (production)
- Networks: 8care-network
- Restart: unless-stopped

**Networks:**
- 8care-network: Bridge driver

**Volumes:**
- postgres_data
- redis_data
- minio_data

### 8.2 Dockerfiles

**API Dockerfile:**
- Multi-stage build:
  - Stage 1 (deps): Install dependencies only
  - Stage 2 (build): Copy source, run build
  - Stage 3 (prod): Copy built files, node_modules, run migrations, start
- Base image: node:20-alpine
- Non-root user for security
- Prisma generate and migrate in entrypoint script

**Web Dockerfile:**
- Multi-stage build:
  - Stage 1 (deps): Install dependencies
  - Stage 2 (build): Build Next.js app
  - Stage 3 (prod): Copy .next, public, node_modules, start
- Base image: node:20-alpine
- Non-root user
- Output: standalone for optimal image size

### 8.3 Startup & Initialization

**Database Migrations:**
- Run automatically in API entrypoint: `npx prisma migrate deploy`
- Seed data: Run if SEED environment variable is true
- Idempotent migrations (check if already applied)

**MinIO Bucket Creation:**
- Script or init container to create buckets
- Use mc (MinIO client) or AWS SDK
- Check if bucket exists before creating

**Environment Variables:**
- Documented in .env.example
- Required vs. optional clearly marked
- Validation on startup (Zod schemas)

**Startup Order:**
- Postgres → Redis, MinIO, MailHog (parallel) → API → Web
- Use depends_on with health checks in Compose v3+

---

## Phase 9: Documentation

### 9.1 README.md (Main)

**Sections:**
- Project overview and tech stack
- Prerequisites (Docker, Node.js)
- Quick start: `docker-compose up --build`
- Environment setup: Copy .env.example, configure
- Accessing services: API (4000), Web (3000), MailHog (8025), MinIO Console (9001)
- Seed users: List emails and passwords
- Running tests: `npm run test` in each repo
- Project structure: Brief overview
- API documentation: Link to Swagger
- Troubleshooting: Common issues
- What's completed vs. skipped (checklist)
- License and contact

### 9.2 Architecture Decision Records (ADRs)

**ADRs to Document:**
- ADR-001: Multi-repo vs. Monorepo (chose multi-repo)
- ADR-002: JWT with Refresh Tokens in httpOnly Cookies
- ADR-003: RBAC with Permissions Table (vs. enum roles only)
- ADR-004: OTP via Email (vs. TOTP only)
- ADR-005: MinIO for File Storage (vs. local filesystem)
- ADR-006: Zustand for Frontend State (vs. Context API)
- ADR-007: shadcn/ui Component Strategy
- ADR-008: Structured Logging with Pino

**ADR Format:**
- Title
- Status: Accepted/Rejected/Superseded
- Context: Why this decision was needed
- Decision: What was decided
- Consequences: Positive and negative outcomes
- Alternatives considered

### 9.3 API Documentation (Swagger)

- Auto-generated from NestJS decorators
- Organized by tags
- Example requests/responses for all endpoints
- Authentication: How to obtain and use tokens
- Rate limiting: Documented per endpoint
- Error codes: Standard error response format

---

## Phase 10: Final Touches & Quality Assurance

### 10.1 Code Quality

**Linting:**
- ESLint with @typescript-eslint, Prettier integration
- Rules: Airbnb style guide with modifications
- Auto-fix on save (recommended VS Code settings)
- Pre-commit hook with Husky + lint-staged

**Type Safety:**
- Strict TypeScript config (strict: true, noImplicitAny, etc.)
- No `any` types allowed (use `unknown` if needed)
- Shared types between API and Web (consider separate package)

**Code Reviews:**
- All PRs require review
- Checklist: Tests pass, lint passes, no console.logs, updated docs

### 10.2 Security Checklist

- [ ] All passwords hashed with bcrypt
- [ ] JWTs signed with strong secrets (>32 chars)
- [ ] Refresh tokens stored hashed in DB
- [ ] httpOnly, secure, sameSite cookies
- [ ] CORS configured (whitelist origins)
- [ ] Rate limiting enabled
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] XSS prevention (React escapes by default, CSP headers)
- [ ] CSRF protection (for state-changing requests)
- [ ] Sensitive data encrypted (OTP secrets, provider tokens)
- [ ] No secrets in codebase or Docker images
- [ ] Environment variables validated on startup
- [ ] Audit logging for security events
- [ ] File upload size limits enforced
- [ ] Email verification required before login
- [ ] OAuth state parameter validated

### 10.3 Performance Optimization

**Backend:**
- Database indexes on frequently queried fields
- Connection pooling (Prisma handles)
- Redis caching for rate limits, OTP
- Pagination for large datasets
- Lazy loading of relations in Prisma

**Frontend:**
- Next.js App Router with Server Components for initial render
- Dynamic imports for large components (React.lazy)
- Image optimization with next/image
- Font optimization (next/font)
- Bundle analysis (check for large dependencies)
- Debounce search inputs (lodash debounce)

### 10.4 Testing Checklist

**Backend:**
- [ ] All auth flows tested
- [ ] RBAC tested for all roles
- [ ] Rate limiting tested
- [ ] File upload tested
- [ ] Error handling tested
- [ ] Audit logs verified

**Frontend:**
- [ ] All forms validated
- [ ] Protected routes enforce auth
- [ ] Role-based UI tested for all roles
- [ ] File upload UI tested
- [ ] Accessibility tested (keyboard nav, screen reader)

### 10.5 Deployment Readiness

- [ ] Docker Compose builds successfully
- [ ] All services start and pass health checks
- [ ] Seed data loads correctly
- [ ] Can login with all seed users
- [ ] API documentation accessible
- [ ] MailHog receives emails
- [ ] MinIO stores and serves files
- [ ] Tests run in CI
- [ ] README complete with all instructions

---

## Summary of Key Design Decisions

1. **Multi-repo** for clear separation, independent deployment
2. **JWT + Refresh Tokens** for stateless auth with long sessions (30 days)
3. **RBAC with permissions table** for flexible, scalable authorization
4. **Optional 2FA via OTP** sent by email (Redis storage)
5. **OAuth SSO** (Google, GitHub) with account linking by email
6. **Required email verification** for security
7. **MinIO** for production-ready, S3-compatible file storage pattern
8. **Zustand** for simple, performant frontend state management
9. **React Hook Form + Zod** for type-safe form validation across stack
10. **shadcn/ui + Radix** for accessible, customizable UI components
11. **Structured logging** with Pino for production observability
12. **Full audit logging** for compliance and security monitoring
13. **GitHub Actions CI/CD** for automated testing and quality gates
14. **OpenAPI/Swagger** for comprehensive, interactive API documentation
15. **WCAG 2.1 AA compliance** for inclusive, accessible user experience
16. **URI versioning** (/api/v1/...) for clear API evolution path
17. **Rate limiting** (global + auth-specific) for security and resource protection
18. **Password strength meter** with zxcvbn for user education
19. **Integration tests** focus for faster feedback and realistic coverage
20. **ADRs** for documenting architectural decisions and context

---

## Implementation Order

### Week 1: Foundation
1. Setup repositories (API, Web)
2. Docker Compose infrastructure
3. Database schema and Prisma setup
4. Seed data script
5. Environment configuration

### Week 2: Backend Core
6. Auth module (local login, registration)
7. Email verification
8. JWT + Refresh token implementation
9. Users module (CRUD)
10. Roles & Permissions module

### Week 3: Backend Advanced
11. OAuth integration (Google, GitHub)
12. OTP/2FA implementation
13. Storage module (MinIO)
14. Audit logging
15. Rate limiting

### Week 4: Frontend Core
16. Next.js setup with shadcn/ui
17. Auth pages (login, register)
18. Protected routes
19. Auth store (Zustand)
20. API client with interceptors

### Week 5: Frontend Features
21. Dashboard layouts per role
22. User management interface
23. Profile pages
24. OTP setup UI
25. File upload (avatars)

### Week 6: Testing & Polish
26. Backend integration tests
27. Frontend tests
28. GitHub Actions CI/CD
29. Documentation (README, ADRs, Swagger)
30. Final security review and deployment

---

## Success Criteria

✅ All four roles (SUPER_ADMIN, COORDINATOR, CAREGIVER, PATIENT) implemented with proper permissions
✅ Complete authentication flow: signup, email verification, login, logout
✅ 30-day sessions with automatic refresh token rotation
✅ Optional OTP 2FA with backup codes
✅ Google and GitHub SSO with account linking
✅ Role-based dashboards with appropriate data visibility
✅ Full audit trail for security events
✅ File upload working with MinIO
✅ Rate limiting protecting sensitive endpoints
✅ Integration tests covering critical paths
✅ WCAG 2.1 AA accessibility compliance
✅ Docker Compose: `docker-compose up --build` starts everything
✅ Comprehensive documentation (README, Swagger, ADRs)
✅ CI/CD pipeline running tests automatically

---

**This execution plan provides a comprehensive blueprint for building a production-grade, secure, accessible, and scalable role management system following modern industry best practices.**
