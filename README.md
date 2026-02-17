# Cocoa Canvas

**An open-source, self-hosted voter database and canvassing platform that gives political campaigns and community organizations a modern alternative to expensive proprietary platforms.**

## Overview

Cocoa Canvas is a tool for managing voter data, conducting targeted outreach campaigns, and coordinating field operations—all while maintaining complete control over your data and operations. Built for transparency, privacy, and ease of use.

## ✨ Features

- **Voter Database Management** - Import, search, and manage voter records
- **Interactive Mapping** - Leaflet-based maps showing voter locations and precincts
- **Canvassing Coordination** - Assign voters to teams and track outreach
- **Data Imports with Audit** - File uploads with validation and full audit trails
- **Export & Analysis** - Export voter lists and campaign data
- **Privacy-First** - Role-based access control, encrypted data, audit logging

## 🚀 Quick Start

**New to the project?** Start here: [**QUICK_START.md**](docs/QUICK_START.md) (5 minutes to running locally)

**Local Development:**
```bash
cd cocoa-canvas
npm install
npm run dev
```
Visit http://localhost:3000

**Production Deployment (with Auto-Setup):**
```bash
docker-compose up -d
```

The app automatically creates an admin user if you provide environment variables:
```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePass123!
ADMIN_NAME=Administrator
```

See [DOCKER_SETUP.md](docs/admin/DOCKER_SETUP.md) for production configuration and [AUTO_SETUP.md](docs/admin/AUTO_SETUP.md) for detailed auto-setup documentation.

## 📁 Project Structure

```
.
├── cocoa-canvas/        # Next.js application (main codebase)
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   ├── lib/            # Backend logic, database, utilities
│   ├── prisma/         # Database schema and migrations
│   ├── package.json
│   └── ...
├── docs/               # Documentation
│   ├── QUICK_START.md
│   ├── admin/          # Deployment & configuration guides
│   ├── developer/      # Architecture & technical docs
│   └── planning/       # Project planning docs
└── README.md           # You are here
```

## 🏗️ Stack

- **Frontend/Backend**: Next.js (React + TypeScript)
- **Database**: Prisma (SQLite dev, PostgreSQL production)
- **Auth**: Local email/password (Phase 1), OAuth/MFA planned
- **Maps**: Leaflet + OpenStreetMap
- **Deployment**: Docker Compose

## 📋 Implementation Roadmap

Cocoa Canvas is built in 4 phases over 8 weeks to MVP:

1. **Phase 1 (Weeks 1-2)**: Docker setup, local authentication, campaign management
2. **Phase 2 (Weeks 3-4)**: Voter import, search/filter, export
3. **Phase 3 (Weeks 5-6)**: GeoJSON import, address geocoding
4. **Phase 4 (Weeks 7-8)**: Interactive map, household clustering, assignments — **MVP**

## 📚 Documentation

All planning and architectural documentation lives in the [`docs/planning/`](docs/planning/) directory:

- **[PROJECT_PLAN.md](docs/planning/PROJECT_PLAN.md)** - Vision, tech stack, deployment scenarios
- **[PHASE_PLAN.md](docs/planning/PHASE_PLAN.md)** - Detailed 4-phase implementation roadmap (START HERE)
- **[DATABASE_SCHEMA.md](docs/planning/DATABASE_SCHEMA.md)** - Complete Prisma schema design
- **[API_PLAN.md](docs/planning/API_PLAN.md)** - REST API specification (50+ endpoints)
- **[AUTH_SECURITY_PLAN.md](docs/planning/AUTH_SECURITY_PLAN.md)** - Authentication & security design
- **[DATA_INGESTION_PLAN.md](docs/planning/DATA_INGESTION_PLAN.md)** - Data import strategy
- **[MAP_DISPLAY_PLAN.md](docs/planning/MAP_DISPLAY_PLAN.md)** - Interactive mapping features

## 🔒 Non-Destructive by Design

- All changes are audited
- Import rollback capability
- No hard deletes—soft deletion with audit trails
- File deduplication prevents accidental re-imports

## 🤝 Contributing

Contributions welcome! (Contributing guide coming soon)

## 📄 License

GNU Affero General Public License v3 (AGPL-3.0)

## 💬 Questions?

See the planning documentation or open an issue.

---

**Ready to build?** Start with [PHASE_PLAN.md](docs/planning/PHASE_PLAN.md) for the implementation roadmap.
