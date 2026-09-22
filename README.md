# Aires-BI — Business Intelligence & Field Survey Platform

A modern, offline-first Progressive Web App (PWA) and enterprise Node.js/Prisma backend built for **retail competitor price intelligence and field audit collection**.

---

## 🎨 Brand Identity

| Role | Color Name | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | **Aires Red** | `#A41821` | Brand Headers, Actions, Price Down Alerts |
| **Secondary** | **Aires Green** | `#017C4D` | On-Target KPIs, Price Up Badges, Sync Status |
| **Accent** | **Aires Orange** | `#FE7914` | Alerts, Pending Badges, PWA Install Notifications |
| **Neutral** | **Aires White** | `#FFFFFF` | Background Panels, Cards, Elevation |

---

## 🏛️ System Architecture

```text
Aires-BI/
├── Backend/                       # Express + Prisma + PostgreSQL + Socket.io
│   ├── prisma/
│   │   ├── schema.prisma          # Database models (User, Product, Competitor, Survey, Alert)
│   │   └── seed.js                # Pilot database seeder
│   └── src/
│       ├── modules/
│       │   ├── auth/              # JWT Login & Session verification
│       │   ├── product/           # Queens pricing catalog & categories
│       │   ├── competitor/        # Competitor chains (Shoa, Allmart, Bambis, etc.)
│       │   ├── survey/            # GPS price submission, assignment & batch sync
│       │   ├── bi/                # Price index algorithm & flat Excel export
│       │   └── user/              # Staff management & territory assignment
│       └── server.js              # HTTP + WebSocket gateway
└── frontend/                      # React 19 + Tailwind CSS v4 + Vite PWA
    └── src/
        ├── features/
        │   ├── auth/              # Login screen with 1-click test personas
        │   ├── survey/            # Field price collection with GPS lock & offline queue
        │   ├── bi/                # Executive dashboard, KPI cards, category health & export
        │   └── users/             # Auditor management & store assignment
        ├── stores/                # Zustand offline persistence (aires-bi-auth, survey-store)
        └── pwa/                   # Auto-reconnection background sync & install prompt

        Quickstart Guide
1. Backend Setup
cd Backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit DATABASE_URL with your PostgreSQL credentials

# 3. Apply Prisma migrations & seed pilot data
npm run db:migrate
npm run db:seed

# 4. Start backend API server
npm run dev
# Server listening on http://localhost:5000

2. Frontend Setup
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Launch Vite development server
npm run dev
# Client running on http://localhost:5173


 Automated Verification Suite
Run the backend smoke test suite to verify health, authentication, field survey GPS submission, and BI calculations:
cd Backend
node scripts/smoke/api-smoke.mjs

 Core Business Logic: Price Action Engine
The BI engine follows the exact pilot formula:
Price Index
=
Queens Price
Cheapest Competitor Average
Price Index= 
Cheapest Competitor Average
Queens Price
​
 
Index > 1.05 
→
→
 PRICE_DOWN (Queens is 
>
5
%
>5%
 more expensive)
Index < 0.95 
→
→
 PRICE_UP (Queens is 
>
5
%
>5%
 cheaper — margin recovery)
0.95 – 1.05 
→
→
 KEEP (Pricing is within competitive tolerance)

 ---

### Implementation Review & Final Status

All 15 batches are now fully executed:

1. **Brand Architecture**: Official palette configured with **Aires Red (`#A41821`) as Primary**, **Aires Green (`#017C4D`) as Secondary**, and **Aires Orange (`#FE7914`) as Accent**.
2. **PWA Integration**: Service worker registration, `manifest.json`, offline precaching, install banners, and automated background sync upon network reconnection.
3. **Backend Domain Modules**: Modular 5-file pattern without static-only classes (`auth`, `product`, `competitor`, `survey`, `bi`, and `user`) validated by Zod.
4. **Pricing BI Engine**: Single-source calculation engine computing competitor averages, benchmark indexing, dashboard KPI cards, category metrics, and flat Excel export datasets.
5. **Field Audit Collection**: Form with GPS coordinate lock, simulated fallback, inline price index previews, and offline queueing.
6. **Frontend State & Design System**: Zustand persistent stores, TanStack Query hooks, `<Can>` RBAC guards, and reusable `DataTable` components.

The platform is configured, seeded, and ready for deployment.