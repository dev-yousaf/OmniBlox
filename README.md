# OmniBlox

OmniBlox is a full-stack, multi-tenant ERP platform for wholesale and distribution teams. It centralizes inventory, warehouses, sales, purchases, quotations, returns, expenses, reporting, and team access control in one system.

## What This Project Does

OmniBlox helps businesses run daily operations end-to-end:

- manages products, categories, brands, and stock across multiple warehouses
- handles sales lifecycle: quotations, invoices, deliveries, and sales returns
- handles procurement lifecycle: purchase orders and purchase returns
- tracks customers, suppliers, billers, and internal team members
- records expenses by category and generates dashboards/reports
- enforces company-level tenant isolation with role-based access

Each company has its own isolated workspace, users, and business data.

## Tech Stack

### Frontend (client)

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Radix UI primitives
- React Hook Form + Zod validation
- Recharts for analytics visualizations
- Framer Motion for interactive UI motion
- Next Themes for theming
- Sonner for toast notifications

### Backend (server)

- NestJS 11 + TypeScript
- Prisma ORM
- PostgreSQL
- Better Auth + Nest integration
- Cookie-based auth sessions
- class-validator / class-transformer
- Nodemailer + Handlebars (email templating)

### Tooling

- pnpm workspaces-style setup (separate client/server apps)
- ESLint + Prettier
- Jest (unit and e2e on server)

## High-Level Architecture

- Client app: Next.js dashboard and auth flows
- API server: NestJS modular REST API
- Database: PostgreSQL with Prisma schema/migrations
- Auth: Better Auth sessions with companyId and role embedded in session context

## Core Domains

- Authentication and company onboarding
- Dashboard KPIs and business summaries
- Inventory and warehouse stock tracking
- Product catalog and product categories
- Sales and sales returns
- Purchases and purchase returns
- Quotations
- Deliveries
- Customers and suppliers
- Expense categories and expenses
- Reports
- Team management and access roles

## Repository Structure

```text
OmniBlox/
├── client/                          # Next.js 15 frontend
│   ├── app/                         # App Router pages
│   │   ├── (auth)/                  # Auth pages (login, signup, etc.)
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   ├── verify-email/
│   │   │   └── verify-otp/
│   │   ├── (dashboard)/             # Dashboard pages (protected)
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── sales/
│   │   │   ├── purchases/
│   │   │   ├── quotations/
│   │   │   ├── returns/
│   │   │   ├── expenses/
│   │   │   ├── suppliers/
│   │   │   ├── people/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                 # Landing page
│   ├── components/                  # Shared UI components
│   │   ├── ui/                      # Base UI primitives
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── purchases/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── app-header.tsx
│   │   ├── app-layout.tsx
│   │   ├── app-sidebar.tsx
│   │   └── landing-page.tsx
│   ├── contexts/                    # React contexts
│   │   └── auth-context.tsx         # Auth state management
│   ├── hooks/                       # Custom React hooks
│   ├── lib/                         # Utilities and API client
│   │   ├── api.ts                   # HTTP client (singleton)
│   │   ├── auth-context.tsx         # Auth provider
│   │   ├── route-guard.tsx          # Protected/guest route guards
│   │   ├── types.ts                 # Shared types
│   │   ├── utils.ts                 # Utility functions
│   │   └── theme-provider.tsx       # Theme wrapper
│   ├── services/                    # Service layer (e.g. reports.service.ts)
│   ├── styles/                      # Global styles
│   ├── types/                       # TypeScript type definitions
│   ├── middleware.ts                # Next.js edge middleware (auth redirect)
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── package.json
│
├── server/                          # NestJS 11 backend
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema (30+ models)
│   │   ├── migrations/              # Prisma migrations
│   │   └── seed.ts                  # Demo data seeder
│   ├── src/
│   │   ├── main.ts                  # App bootstrap (CORS, validation, logging)
│   │   ├── app.module.ts            # Root module (imports all domain modules)
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   ├── auth/                    # Authentication & authorization
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts   # /auth/* endpoints
│   │   │   ├── auth.service.ts      # Signup, login, magic link, password reset
│   │   │   ├── auth.config.ts       # Better Auth configuration
│   │   │   ├── better-auth.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── better-auth.guard.ts
│   │   │   │   └── roles.guard.ts   # RBAC enforcement
│   │   │   ├── decorators/
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   ├── company-id.decorator.ts
│   │   │   │   └── user-id.decorator.ts
│   │   │   └── dto/                 # Request DTOs
│   │   ├── common/
│   │   │   ├── logging.middleware.ts # Request/response logging
│   │   │   └── logging.util.ts      # Sensitive data masking
│   │   ├── prisma/
│   │   │   └── prisma.service.ts    # Prisma client singleton
│   │   ├── email/
│   │   │   └── email.service.ts     # Nodemailer + Handlebars
│   │   ├── products/
│   │   │   ├── product.module.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── product.service.ts
│   │   │   └── dto/
│   │   ├── product-categories/
│   │   ├── sales/
│   │   ├── sales-returns/
│   │   ├── purchases/
│   │   ├── purchase-returns/
│   │   ├── quotations/
│   │   ├── deliveries/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── billers/
│   │   ├── warehouses/
│   │   ├── inventory/
│   │   ├── stock-adjustments/
│   │   ├── expenses/
│   │   ├── expense-categories/
│   │   ├── returns/                 # Unified returns logic
│   │   ├── team/                    # User management
│   │   ├── dashboard/               # KPI endpoints
│   │   ├── reports/                 # Report generation
│   │   └── types/                   # Shared server types
│   ├── test/                        # E2E tests
│   ├── .env.example
│   └── package.json
│
└── smtp/                            # Local SMTP config (optional)
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 14+

## Environment Variables

### Server: `server/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | - | Secret key for Better Auth session signing |
| `PORT` | No | `5005` | API server port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `DATABASE_URL_POOLED` | No | - | Pooled connection string (PgBouncer, etc.) |
| `SMTP_HOST` | No | - | SMTP server host |
| `SMTP_PORT` | No | - | SMTP server port |
| `SMTP_USER` | No | - | SMTP authentication user |
| `SMTP_PASS` | No | - | SMTP authentication password |
| `SMTP_FROM` | No | - | From address for outgoing emails |

### Client: `client/.env.local`

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5005` | API base URL |

## Local Setup

1. Install dependencies

```bash
cd client
pnpm install

cd ../server
pnpm install
```

2. Configure env files

- create `server/.env` with required values
- optionally create `client/.env.local`

3. Run database migrations

```bash
cd server
pnpm prisma:migrate
```

4. Seed sample data

```bash
cd server
pnpm prisma:seed
```

5. Start backend

```bash
cd server
pnpm start:dev
```

6. Start frontend

```bash
cd client
pnpm dev
```

7. Open app

- Frontend: http://localhost:3000
- API: http://localhost:5005 (if PORT=5005)

## Key Database Entities (Schema Overview)

The Prisma schema defines **30+ models** organized around multi-tenant company isolation:

### Tenant Core
- **Company** - Root tenant entity; all data rows link back via `companyId`
- **User** - Belongs to a company; roles: `OWNER`, `ADMIN`, `MANAGER`, `STAFF`
- **Session** - Better Auth session with embedded `companyId` and `role`

### Product & Inventory
- **Product** - SKU, prices, reorder level, linked to category/brand
- **ProductCategory** - Category names (unique per company)
- **Brand** - Brand names (unique per company)
- **Warehouse** - Physical storage locations
- **Inventory** - Composite `(productId, warehouseId)` quantity tracking
- **StockAdjustment** / **StockAdjustmentItem** - Manual stock corrections

### Sales & Customers
- **Customer** - Name, email, phone, address (email unique per company)
- **Sale** - Invoice number, totals, tax, discount, payment status/method
- **SaleItem** - Line items with returned quantity tracking
- **Delivery** - One-to-one with Sale; status lifecycle: PENDING -> IN_TRANSIT -> DELIVERED

### Purchases & Suppliers
- **Supplier** - Name, email, phone, address (email unique per company)
- **PurchaseOrder** - Reference number, total, order status
- **PurchaseOrderItem** - Line items with returned quantity tracking

### Quotations
- **Quotation** / **QuotationItem** - Pre-sale quotes with expiry dates

### Returns
- **SalesReturn** / **SalesReturnItem** - Return against sales; optional saleItem link
- **PurchaseReturn** / **PurchaseReturnItem** - Return against purchases

### Expenses
- **ExpenseCategory** - Named categories (unique per company)
- **Expense** - Amount, vendor, payment method, status (PENDING/APPROVED/PAID/REJECTED)
- **ExpenseAttachment** - File attachments per expense

### People
- **Biller** - Biller code (unique per company), contact info, status

### Enums
- `UserRole`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `ProductStatus`, `ReturnStatus`, `ExpenseStatus`, `BillerStatus`, `DeliveryStatus`, `TokenType`

## Authentication & Authorization

### Auth Flow

| Feature | Implementation |
|---|---|
| Email/password signup | Creates company + owner user in a transaction |
| Login | Validates credentials, creates Better Auth session, sets cookies |
| Session validation | Cookie-based; `@AuthGuard` extracts session → `companyId` + `role` |
| Logout | Invalidates session server-side, clears cookies |
| Email verification | OTP-based; 6-digit code sent via Nodemailer |
| Password reset | Token-based; 15-minute expiry, single-use |
| Magic link login | Token-based; auto-authenticates on link click |
| Profile management | Name/email update, password change |

### Authorization (RBAC)

Four hierarchical roles: **OWNER > ADMIN > MANAGER > STAFF**

- **`RolesGuard`** reads `@Roles()` decorator metadata and compares against session role
- **`@Roles(UserRole.OWNER, UserRole.ADMIN)`** on controllers restricts endpoints
- **`CompanyId`** decorator extracts tenant ID from session for data scoping
- All queries are scoped by `companyId` - cross-tenant data access is impossible at the database level
- Staff can read most data; management roles (OWNER, ADMIN, MANAGER) can create/update/delete
- Sensitive reports (e.g. staff performance) restricted to OWNER/ADMIN

### Guards Applied Globally

```typescript
@Controller('products')
@UseGuards(AuthGuard, RolesGuard)  // Session + role check on every route
```

## API Endpoints

All endpoints are prefixed with `http://localhost:5005/` (configurable via `PORT` and `NEXT_PUBLIC_API_URL`).

### Auth (`/auth`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/auth/signup` | Anonymous | - | Register new company + owner |
| POST | `/auth/login` | Anonymous | - | Login with email/password |
| POST | `/auth/logout` | Authenticated | - | Clear session |
| GET | `/auth/me` | Authenticated | - | Get current user profile |
| PUT | `/auth/profile` | Authenticated | - | Update name/email |
| PUT | `/auth/change-password` | Authenticated | - | Change password |
| GET | `/auth/validate` | Authenticated | - | Validate session token |
| GET | `/auth/company` | Authenticated | - | Get current company ID |
| GET | `/auth/session` | Authenticated | - | Get session metadata |
| POST | `/auth/verify-email` | Anonymous | - | Verify email with token |
| POST | `/auth/verify-otp` | Anonymous | - | Verify OTP code |
| POST | `/auth/resend-otp` | Anonymous | - | Resend verification OTP |
| POST | `/auth/update-signup-email` | Anonymous | - | Change email before verification |
| POST | `/auth/magic-login/request` | Anonymous | - | Request magic link email |
| POST | `/auth/magic-login/verify` | Anonymous | - | Verify magic link token |
| POST | `/auth/password-reset/request` | Anonymous | - | Request password reset |
| POST | `/auth/password-reset/verify` | Anonymous | - | Reset password with token |

### Dashboard (`/dashboard`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/dashboard/stats` | Authenticated | All | KPIs and business summaries |

### Products (`/products`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/products` | Authenticated | All | List products (paginated, filterable) |
| GET | `/products/categories` | Authenticated | All | List product categories |
| GET | `/products/brands` | Authenticated | All | List brands |
| GET | `/products/low-stock` | Authenticated | All | Low stock alerts |
| GET | `/products/stats` | Authenticated | All | Product statistics |
| GET | `/products/warehouses` | Authenticated | All | List warehouses |
| GET | `/products/sku/:sku` | Authenticated | All | Lookup by SKU |
| GET | `/products/:id` | Authenticated | All | Get single product |
| POST | `/products` | Authenticated | Management | Create product |
| PUT | `/products/:id` | Authenticated | Management | Update product |
| PUT | `/products/:id/stock` | Authenticated | Management | Adjust stock (add/subtract) |
| DELETE | `/products/:id` | Authenticated | Management | Delete product |
| GET | `/products/adjustments` | Authenticated | All | List stock adjustments |
| GET | `/products/adjustments/:id` | Authenticated | All | Get stock adjustment |
| POST | `/products/adjustments` | Authenticated | Management | Create stock adjustment |

### Sales (`/sales`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/sales` | Authenticated | All | List sales (paginated) |
| GET | `/sales/stats` | Authenticated | All | Sales statistics |
| GET | `/sales/:id` | Authenticated | All | Get single sale |
| POST | `/sales` | Authenticated | All | Create sale (from quotation or direct) |
| PUT | `/sales/:id` | Authenticated | Management | Update sale |
| PATCH | `/sales/:id/mark-paid` | Authenticated | Management | Mark as paid |
| DELETE | `/sales/:id` | Authenticated | Management | Delete sale |

### Purchases (`/purchases`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/purchases` | Authenticated | All | List purchase orders |
| GET | `/purchases/:id` | Authenticated | All | Get single purchase order |
| POST | `/purchases` | Authenticated | Management | Create purchase order |
| PUT | `/purchases/:id` | Authenticated | Management | Update purchase order |
| DELETE | `/purchases/:id` | Authenticated | Management | Delete purchase order |

### Quotations (`/quotations`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/quotations` | Authenticated | All | List quotations |
| GET | `/quotations/:id` | Authenticated | All | Get single quotation |
| POST | `/quotations` | Authenticated | Management | Create quotation |
| PUT | `/quotations/:id` | Authenticated | Management | Update quotation |
| DELETE | `/quotations/:id` | Authenticated | Management | Delete quotation |

### Sales Returns (`/sales-returns`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/sales-returns` | Authenticated | All | List sales returns |
| GET | `/sales-returns/:id` | Authenticated | All | Get single return |
| POST | `/sales-returns` | Authenticated | Management | Create return |
| PUT | `/sales-returns/:id` | Authenticated | Management | Update return |
| DELETE | `/sales-returns/:id` | Authenticated | Management | Delete return |

### Purchase Returns (`/purchase-returns`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/purchase-returns` | Authenticated | All | List purchase returns |
| GET | `/purchase-returns/:id` | Authenticated | All | Get single return |
| POST | `/purchase-returns` | Authenticated | Management | Create return |
| PUT | `/purchase-returns/:id` | Authenticated | Management | Update return |
| DELETE | `/purchase-returns/:id` | Authenticated | Management | Delete return |

### Customers (`/customers`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/customers` | Authenticated | All | List customers |
| GET | `/customers/:id` | Authenticated | All | Get single customer |
| POST | `/customers` | Authenticated | Management | Create customer |
| PUT | `/customers/:id` | Authenticated | Management | Update customer |
| DELETE | `/customers/:id` | Authenticated | Management | Delete customer |

### Suppliers (`/suppliers`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/suppliers` | Authenticated | All | List suppliers |
| GET | `/suppliers/:id` | Authenticated | All | Get single supplier |
| POST | `/suppliers` | Authenticated | Management | Create supplier |
| PUT | `/suppliers/:id` | Authenticated | Management | Update supplier |
| DELETE | `/suppliers/:id` | Authenticated | Management | Delete supplier |

### Billers (`/billers`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/billers` | Authenticated | All | List billers |
| GET | `/billers/:id` | Authenticated | All | Get single biller |
| POST | `/billers` | Authenticated | Management | Create biller |
| PUT | `/billers/:id` | Authenticated | Management | Update biller |
| DELETE | `/billers/:id` | Authenticated | Management | Delete biller |

### Warehouses (`/warehouses`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/warehouses` | Authenticated | All | List warehouses |
| GET | `/warehouses/:id` | Authenticated | All | Get single warehouse |
| POST | `/warehouses` | Authenticated | Management | Create warehouse |
| PUT | `/warehouses/:id` | Authenticated | Management | Update warehouse |
| DELETE | `/warehouses/:id` | Authenticated | Management | Delete warehouse |

### Inventory (`/inventory`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/inventory` | Authenticated | All | List inventory (product-warehouse) |
| GET | `/inventory/:productId/:warehouseId` | Authenticated | All | Get specific stock level |
| POST | `/inventory/transfer` | Authenticated | Management | Transfer stock between warehouses |

### Expenses (`/expenses`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/expenses` | Authenticated | All | List expenses (filterable) |
| GET | `/expenses/:id` | Authenticated | All | Get single expense |
| POST | `/expenses` | Authenticated | Management | Create expense |
| PUT | `/expenses/:id` | Authenticated | Management | Update expense |
| DELETE | `/expenses/:id` | Authenticated | Management | Delete expense |

### Expense Categories (`/expense-categories`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/expense-categories` | Authenticated | All | List categories |
| POST | `/expense-categories` | Authenticated | Management | Create category |
| PUT | `/expense-categories/:id` | Authenticated | Management | Update category |
| DELETE | `/expense-categories/:id` | Authenticated | Management | Delete category |

### Product Categories (`/product-categories`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/product-categories` | Authenticated | All | List categories |
| POST | `/product-categories` | Authenticated | Management | Create category |
| PUT | `/product-categories/:id` | Authenticated | Management | Update category |
| DELETE | `/product-categories/:id` | Authenticated | Management | Delete category |

### Deliveries (`/deliveries`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/deliveries` | Authenticated | All | List deliveries |
| GET | `/deliveries/:id` | Authenticated | All | Get single delivery |
| POST | `/deliveries` | Authenticated | Management | Create delivery |
| PUT | `/deliveries/:id` | Authenticated | Management | Update delivery status |
| DELETE | `/deliveries/:id` | Authenticated | Management | Delete delivery |

### Stock Adjustments (`/stock-adjustments`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/stock-adjustments` | Authenticated | All | List adjustments |
| GET | `/stock-adjustments/:id` | Authenticated | All | Get single adjustment |
| POST | `/stock-adjustments` | Authenticated | Management | Create adjustment |

### Team (`/team`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/team` | Authenticated | All | List team members |
| GET | `/team/stats` | Authenticated | All | Team statistics |
| GET | `/team/:id` | Authenticated | All | Get team member |
| POST | `/team` | Authenticated | Admin+ | Create team member |
| PUT | `/team/:id` | Authenticated | Admin+ | Update team member |
| PUT | `/team/:id/password` | Authenticated | Admin+ | Reset member password |
| DELETE | `/team/:id` | Authenticated | Admin+ | Remove team member |

### Reports (`/reports`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/reports/expenses` | Authenticated | All | Generate expense report |
| POST | `/reports/financial-summary` | Authenticated | Management | P&L statement |
| POST | `/reports/inventory-summary` | Authenticated | Management | Inventory valuation |
| POST | `/reports/sales-summary` | Authenticated | Management | Sales aggregation |
| POST | `/reports/staff-performance` | Authenticated | Owner/Admin | Staff KPIs |
| POST | `/reports/tax-summary` | Authenticated | Management | Tax report |

## Useful Scripts

### Client

```bash
pnpm dev            # Start dev server (port 3000)
pnpm build          # Production build
pnpm start          # Start production server
pnpm lint           # Lint and fix
```

### Server

```bash
pnpm start:dev       # Start dev server with hot reload (port 5005)
pnpm build           # Compile NestJS
pnpm start:prod      # Start compiled production server
pnpm start:debug     # Start with debugger
pnpm lint            # Lint and fix
pnpm test            # Run unit tests
pnpm test:e2e        # Run end-to-end tests
pnpm test:cov        # Run tests with coverage
pnpm prisma:migrate  # Run pending Prisma migrations
pnpm prisma:generate # Regenerate Prisma client
pnpm prisma:reset    # Reset database (drop all data)
pnpm prisma:seed     # Seed demo data
pnpm format          # Format code with Prettier
```

## Seeded Demo Data

The seed script creates:

- a company workspace
- owner, manager, and staff users
- warehouses, products, suppliers, customers, and billers
- quotation, purchase order, sale, delivery, returns, and expenses

For local demo, a default password is printed at seed completion.

## Error Handling

### Backend

- **ValidationPipe** (global) with `whitelist: true` - strips unknown properties from DTOs
- **class-validator** decorators on all DTOs provide declarative validation rules
- Standard NestJS exceptions used throughout:
  - `BadRequestException` - Invalid input, expired tokens
  - `ConflictException` - Duplicate email, SKU, workspace URL
  - `NotFoundException` - Entity not found within company scope
  - `UnauthorizedException` - Invalid credentials, missing session
- **Global logging middleware** captures all request/response payloads with auto-masking of sensitive fields (passwords, tokens, authorization headers)
- Better Auth integration handles session lifecycle errors (expired, invalid)

### Frontend

- **API client** (`lib/api.ts`): Generic `request<T>()` method catches HTTP errors, parses error bodies, and throws structured `ApiError` objects
- Error logging uses console.warn for 4xx and console.error for 5xx
- Network errors (fetch failures) are caught and reported as user-friendly messages
- Auth context errors propagate to UI components for toast notifications (Sonner)

## Security Features

### Multi-Tenant Isolation
- Every model has a `companyId` foreign key - all queries are scoped by company
- Composite unique constraints prevent data leakage: `@@unique([companyId, sku])`
- `@CompanyId()` decorator extracts tenant from session, enforced on every endpoint
- Cross-tenant access is structurally impossible

### Authentication
- Passwords hashed with Better Auth's `hashPassword` (compatible with their verification)
- Legacy bcrypt passwords are auto-migrated to Better Auth format on first login
- Cookie-based sessions with `Secure`, `HttpOnly`, `SameSite` attributes in production
- Session tokens stored as SHA-256 hashes in database (raw token only in cookie)
- Session expiry: 7 days with 1-day sliding update window and 5-min cookie cache
- Login rate limiting via retry-with-backoff pattern (200ms, 400ms delays)

### Authorization
- `RolesGuard` enforces role-based access on all protected endpoints
- `AuthGuard` validates session on every request
- Anonymous-only endpoints explicitly marked with `@AllowAnonymous()`
- Route-level RBAC via `@Roles()` decorator
- Client-side route guards (`ProtectedRoute`, `GuestRoute`) for UI hardening

### Data Protection
- Request/response logging auto-masks passwords, authorization headers, and long tokens
- Email verification prevents unverified account usage
- Magic link tokens expire in 15 minutes, single-use
- Password reset tokens expire in 15 minutes, single-use
- OTP codes expire in 10 minutes
- User enumeration prevention: auth endpoints return identical messages whether user exists or not

### Production Checklist
- Use strong, randomly generated `AUTH_SECRET`
- Enable secure cookies (`Secure`, `HttpOnly`, `SameSite=Strict`)
- Restrict `CORS_ORIGIN` to known frontend domains
- Remove demo credentials and seed data
- Use `DATABASE_URL_POOLED` for connection pooling in production
- Enable HTTPS termination at the reverse proxy level

## Code Standards

### Backend (NestJS)
- **Modular architecture**: One module per domain with controller, service, module, and DTOs
- **DTO validation**: All inputs validated with `class-validator` decorators
- **Auth guards**: Every controller protected by `AuthGuard` and `RolesGuard`
- **Tenant scoping**: All service methods accept `companyId` as first parameter
- **Error handling**: Standard NestJS HTTP exceptions, never raw `throw Error`
- **Logging**: Structured request/response logging with sensitive data masking
- **Naming**: PascalCase for classes/interfaces, camelCase for methods/variables, kebab-case for files

### Frontend (Next.js)
- **TypeScript**: Strict mode enabled; interfaces defined in `types/` or co-located
- **Components**: Co-located in domain folders under `components/`
- **Client components**: Marked with `"use client"` directive where needed
- **Auth state**: Managed via `AuthContext` with `useAuth()` hook
- **API client**: Singleton `api` instance with typed methods
- **Route guards**: `ProtectedRoute` and `GuestRoute` wrappers for auth-aware rendering
- **Styles**: Tailwind CSS 4 utility classes; no CSS-in-JS
- **Icons**: `lucide-react` icon library

### General
- ESLint with strict TypeScript rules on both client and server
- Prettier for consistent formatting
- Prisma as single source of truth for database schema
- pnpm for dependency management

## Support

### Getting Help
- **Documentation**: Start with this README
- **Issues & Bugs**: Report at the project repository issue tracker
- **Architecture questions**: Review the source code - the structure follows NestJS conventions with clear module boundaries

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes following conventional commits
4. Push and open a Pull Request

### Known Limitations
- No file upload service for expense attachments (stored as URLs only)
- No real-time notifications (polling-based)
- No offline support
- No mobile-responsive dashboard (desktop-first)

## Status

Active full-stack project with modular backend domains and a comprehensive dashboard frontend.

## License

This repository currently has no explicit open-source license. Add one before public distribution if needed.
