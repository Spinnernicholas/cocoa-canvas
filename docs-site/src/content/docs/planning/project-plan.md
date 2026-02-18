---
title: Cocoa Canvas - Project Plan
---

# Cocoa Canvas - Project Plan

## Overview

Cocoa Canvas is an open-source voter information and canvassing application designed as an alternative to proprietary tools like PDI (Political Data Inc.). Built by and for the Cocoa County community, it provides grassroots organizations with accessible tools for voter outreach, canvassing, and campaign management.

## Core Philosophy

- **Open Source**: Fully transparent, community-driven development
- **Lightweight**: Runs standalone with minimal infrastructure requirements
- **Scalable**: Deploy locally or to production with PostgreSQL
- **Docker-First**: Containerized from day one for consistency and ease of deployment

---

## Technology Stack

### Frontend & Full Stack
- **Next.js** (React framework)
  - API routes for backend
  - Server-side rendering for SEO and performance
  - TypeScript for type safety
  - Tailwind CSS for styling

### Database
- **Primary**: PostgreSQL (production deployments)
- **Alternative**: SQLite (standalone, development, small deployments)
- **ORM**: Prisma (supports both SQLite and PostgreSQL seamlessly)

### Containerization & Deployment
- **Docker** (container images)
- **Docker Compose** (orchestration)
- **Environment-based configuration** (dev, staging, production)

### Supporting Libraries
- Authentication: Next-auth or similar
- Validation: Zod or similar for schema validation
- Data management: React Query or SWR
- Mapping: Mapbox or Leaflet (optional, for geo-visualization)

---

## Architecture Overview

### Application Structure

```
cocoa-canvas/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── canvass/           # Canvassing interface
│   ├── voters/            # Voter data views
│   ├── campaigns/         # Campaign management
│   └── settings/          # Admin & configuration
├── prisma/                # Database schema and migrations
│   ├── schema.prisma
│   └── migrations/
├── lib/                   # Shared utilities
│   ├── auth/
│   ├── db/
│   └── utils/
├── components/            # React components
├── public/                # Static assets
├── docker/                # Docker configuration
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
├── .env.example           # Environment variables template
└── package.json
```

---

## Deployment Scenarios

### Scenario 1: Local Development
**Use Case**: Developer working on features
```bash
npm install
npm run dev
# SQLite database in ./data directory
# App accessible at http://localhost:3000 with hot reload
```

### Scenario 2: Small Organization with SQLite
**Use Case**: Small grassroots group, single server
```bash
docker-compose up -d
# SQLite database persisted to volume
# Can run on modest hardware
```

### Scenario 3: Production with PostgreSQL
**Use Case**: Multi-user, production deployment
```bash
docker-compose -f docker-compose.prod.yml up
# PostgreSQL container or connection to managed database
# Load balancing, backups, scaling ready
```

---

## Core Features (by Phase)

### Phase 1: Foundation
- Docker setup with SQLite
- Admin authentication (email/password)
- Campaign/race basic info (name, dates, target area)
- Job queue for imports

### Phase 2: Voter Data
- Import Contra Costa voter files
- Search and filter voters (name, address, party, status)
- Export voter lists as CSV
- Add notes to voters

### Phase 3: Geographic Data
- Import GeoJSON shape files (precincts, parcels)
- Calculate centroids from polygons
- Batch geocoding (Census API + parcel fallback)
- Link voters to precincts

### Phase 4: MVP - Map & Canvassing
- Interactive map with Leaflet
- Display voter points and precinct boundaries
- Group voters into households by address
- Filter voters on map
- View/export voter lists
- Basic campaign management

---

## Development Workflow (See PHASE_PLAN.md for Details)

Each phase is 2 weeks:

### Phase 1: Foundation (Week 1-2)
- Docker + SQLite setup
- Admin auth system
- Setup wizard
- Job queue
- Minimal dashboard

### Phase 2: Voter Data (Week 3-4)
- Voter file import (Contra Costa)
- Search/filter/export
- Notes and audit

### Phase 3: Geographic Data (Week 5-6)
- GeoJSON import
- Geocoding integration
- Precinct linking

### Phase 4: MVP - Map & Households (Week 7-8)
- Leaflet map display
- Household grouping
- Full MVP functionality

---

## Environment Variables

Key configuration (to be documented in `.env.example`):

```
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/cocoa_canvas
# or for SQLite:
# DATABASE_URL=file:./data/cocoa_canvas.db

# Application
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000

# Feature flags
USE_POSTGRES=true
ENABLE_OFFLINE_MODE=false
```

---

## Docker Compose Strategy

### Development (Local)
- Run `npm run dev` for local development
- SQLite database
- Hot reload enabled
- No Docker needed for development

### Production (`docker-compose.yml`)
- Production Next.js build
- SQLite or PostgreSQL database (optional PostgreSQL profile)
- Health checks and restart policies
- Optimized for deployment

---

## Success Criteria

- ✓ Application runs standalone with one command (docker-compose up)
- ✓ Can import 150K+ voter records in < 5 minutes
- ✓ Voters display on interactive map with search/filter
- ✓ All data access logged for audit trail
- ✓ No data loss or corruption
- ✓ Docker Compose works with SQLite (PostgreSQL optional)
- ✓ Can scale horizontally with PostgreSQL upgrade

---

## Timeline

- **Week 1-2**: Phase 1 (Docker, auth, setup wizard)
- **Week 3-4**: Phase 2 (Voter import, search, export)
- **Week 5-6**: Phase 3 (Geocoding, parcels, precincts)
- **Week 7-8**: Phase 4 (Map, households, MVP complete)

**Total: 8 weeks to MVP**

---

## Repository Structure

```
Cocoa County/cocoa-canvas/
├── main application code
├── cocoa-canvas-docs/  (separate repo for comprehensive docs)
├── cocoa-canvas-deploy/ (separate repo for Terraform/K8s configs if needed)
```

---

## Implementation Authority

**PHASE_PLAN.md is the implementation authority.**

All other planning documents serve as reference:
- **Master Database Schema**: Developer schema reference (see [DATABASE_SCHEMA_MASTER.md](../developer/DATABASE_SCHEMA_MASTER.md))
- **API_PLAN.md**: Full API design (see PHASE_PLAN for which endpoints per phase)
- **AUTH_SECURITY_PLAN.md**: Full vision (Phase 1 starts minimal, OAuth/MFA/LDAP in later phases)
- **DATA_INGESTION_PLAN.md**: Design reference (Phase 2 starts with voter files)
- **MAP_DISPLAY_PLAN.md**: Phase 4 MVP feature

See **PHASE_PLAN.md** for execution details.
