# Aires-BI — Business Intelligence & Field Survey Platform

A modern, offline-first Progressive Web App (PWA) and enterprise Node.js/Prisma backend built for retail competitor price intelligence and field audit collection.

---

## 🎨 Brand Identity

| Role | Color Name | Hex Code | Purpose |
|---|---|---|---|
| **Primary** | **Aires Red** | `#A41821` | Brand headers, actions, price-down alerts |
| **Secondary** | **Aires Green** | `#017C4D` | On-target KPIs, price-up badges, sync status |
| **Accent** | **Aires Orange** | `#FE7914` | Alerts, pending badges, PWA install notifications |
| **Neutral** | **Aires White** | `#FFFFFF` | Background panels, cards, elevation |

---

## 🏛️ System Architecture

```text
Aires-BI/
│
├── Backend/                         # Express + Prisma + PostgreSQL + Socket.io
│   ├── prisma/
│   │   ├── schema.prisma            # Database models
│   │   └── seed.js                  # Pilot database seeder
│   │
│   └── src/
│       ├── modules/
│       │   ├── auth/                # JWT login & session verification
│       │   ├── product/             # Product pricing catalog & categories
│       │   ├── competitor/          # Competitor chains and stores
│       │   ├── survey/              # GPS price submission, assignment & batch sync
│       │   ├── bi/                  # Price index algorithm & Excel export
│       │   └── user/                # Staff management & territory assignment
│       │
│       └── server.js                # HTTP + WebSocket gateway
│
└── frontend/                        # React 19 + Tailwind CSS v4 + Vite PWA
    └── src/
        ├── features/
        │   ├── auth/                # Login & test personas
        │   ├── survey/              # Field price collection & offline queue
        │   ├── bi/                  # Executive dashboard & KPI reporting
        │   └── users/               # Auditor management & store assignment
        │
        ├── stores/                  # Zustand offline persistence
        └── pwa/                     # Background sync & install prompt
```

---

# 🚀 Quickstart Guide

## 1. Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env and configure your PostgreSQL DATABASE_URL

# Apply Prisma migrations
npm run db:migrate

# Seed pilot data
npm run db:seed

# Start backend API server
npm run dev
```

Backend server:

```text
http://localhost:5000
```

---

## 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start Vite development server
npm run dev
```

Frontend application:

```text
http://localhost:5173
```

---

# 🧪 Automated Verification Suite

Run the backend smoke test suite to verify:

- API health
- Authentication
- Field survey submission
- GPS handling
- BI calculations
- Price action classification

```bash
cd Backend

node scripts/smoke/api-smoke.mjs
```

---

# 📊 Core Business Logic: Price Action Engine

The BI engine uses the following pilot pricing formula:

```text
Price Index = Queens Price / Cheapest Competitor Average
```

The resulting index determines the recommended price action:

| Price Index | Action | Meaning |
|---|---|---|
| `> 1.05` | `PRICE_DOWN` | Queens is more than 5% more expensive |
| `< 0.95` | `PRICE_UP` | Queens is more than 5% cheaper |
| `0.95 – 1.05` | `KEEP` | Pricing is within the competitive tolerance |

### Example

If:

```text
Queens Price = 110
Cheapest Competitor Average = 100
```

Then:

```text
Price Index = 110 / 100
            = 1.10
```

Since `1.10 > 1.05`, the resulting action is:

```text
PRICE_DOWN
```

---

# ✅ Implementation Review & Final Status

All **15 implementation batches** have been executed.

### 1. Brand Architecture

The official Aires-BI palette has been configured:

- **Primary:** Aires Red `#A41821`
- **Secondary:** Aires Green `#017C4D`
- **Accent:** Aires Orange `#FE7914`
- **Neutral:** Aires White `#FFFFFF`

### 2. PWA Integration

Implemented:

- Service worker registration
- `manifest.json`
- Offline precaching
- PWA installation banner
- Background synchronization
- Automatic synchronization after network reconnection

### 3. Backend Domain Modules

The backend follows a modular domain architecture covering:

- `auth`
- `product`
- `competitor`
- `survey`
- `bi`
- `user`

Input validation is handled with Zod.

### 4. Pricing BI Engine

The BI engine provides a centralized pricing calculation layer responsible for:

- Competitor price calculations
- Cheapest competitor benchmarking
- Price index calculation
- Price action classification
- Dashboard KPI calculations
- Category-level metrics
- Excel export datasets

### 5. Field Audit Collection

The field survey workflow includes:

- GPS coordinate capture
- GPS validation/lock
- Fallback handling
- Inline price index preview
- Offline survey queueing
- Batch synchronization

### 6. Frontend State & Design System

The frontend includes:

- Zustand persistent stores
- TanStack Query
- RBAC `<Can>` guards
- Reusable `DataTable` components
- Offline state persistence
- PWA-aware application behavior

---

# 📦 Deployment Status

The Aires-BI platform is:

- Configured
- Seeded
- Verified
- Offline-capable
- Integrated with the pricing BI engine
- Ready for deployment

```text
Status: READY FOR DEPLOYMENT
```
