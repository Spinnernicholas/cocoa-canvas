# Cocoa Canvas

**An open-source, self-hosted voter database and canvassing platform that gives political campaigns and community organizations a modern alternative to expensive proprietary platforms.**

[![Tests](https://github.com/Spinnernicholas/cocoa-canvas/actions/workflows/test.yml/badge.svg)](https://github.com/Spinnernicholas/cocoa-canvas/actions/workflows/test.yml)
[![Docs](https://github.com/Spinnernicholas/cocoa-canvas/actions/workflows/deploy-docs.yml/badge.svg)](https://spinnernicholas.github.io/cocoa-canvas/)

## Overview

Cocoa Canvas is a tool for managing voter data, conducting targeted outreach campaigns, and coordinating field operations—all while maintaining complete control over your data and operations. Built for transparency, privacy, and ease of use.

📖 **[View Full Documentation](https://spinnernicholas.github.io/cocoa-canvas/)** - Complete guides, architecture docs, and planning information

## 📊 Current Status

**Phase 3 In Progress** 🔄 Campaign Management & Map Visualization  
**Last Updated**: February 17, 2026

✅ **Implemented**: Authentication, Person Management (Voters/Volunteers/Donors), CSV Import, Search & Filter  
🔄 **In Development**: Campaign Dashboard, Parcel Data Integration, GIS Services  
📋 **Planned**: Interactive Maps, Household Clustering, Team Assignments

👉 **[See Full Status & Roadmap](docs/developer/STATUS.md)**

## ✨ Currently Implemented Features

- **Person-Centric Database** - Manage voters, volunteers, and donors in unified system
- **CSV Import & De-duplication** - Import voter/contact data with automatic de-duplication
- **Advanced Search & Filtering** - Real-time search by name, email, phone, address
- **Contact Information Management** - Multiple addresses, phones, and emails per person
- **Volunteer & Donor Tracking** - Optional volunteer and donor information per person
- **Full Audit Logging** - Complete audit trail of all changes
- **Role-Based Access Control** - User permissions and data security
- **Privacy-First** - No hard deletes, soft deletion with audit trails

### Feature Status at a Glance

| Feature | Status |
|---------|--------|
| **Authentication & Users** | ✅ Complete |
| **Person/Voter Database** | ✅ Complete |
| **CSV Import** | ✅ Complete |
| **Search & Filter** | ✅ Complete |
| **Campaign Management** | ✅ Complete |
| **GIS & Geocoding** | ✅ Complete |
| **Interactive Maps** | 🔄 In Progress |
| **Team Assignments** | 📋 Planned |
| **Field Canvassing** | 📋 Planned |

## 🚀 Quick Start

**New to the project?** Start here:
- 📖 [**Full Documentation Site**](https://spinnernicholas.github.io/cocoa-canvas/) - Browse all guides and docs
- 🏃 [**Quick Start Guide**](docs/QUICK_START.md) - Set up locally with Docker
- 🔧 [**Troubleshooting**](docs/TROUBLESHOOTING.md) - Common issues and solutions

**Local Development (Docker):**
```bash
# Clone the repository
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas/cocoa-canvas

# Start PostgreSQL, Redis, and Next.js app in Docker
npm run docker:dev:up

# View logs
npm run docker:dev:logs
```
Visit http://localhost:3000

**Production Deployment (with Auto-Setup):**
```bash
# From the cocoa-canvas directory
cd cocoa-canvas
docker-compose up -d
```

The app automatically creates an admin user if you provide environment variables:
```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePass123!
ADMIN_NAME=Administrator
```

See [DOCKER_SETUP.md](https://spinnernicholas.github.io/cocoa-canvas/admin/docker_setup/) for production configuration and [AUTO_SETUP.md](https://spinnernicholas.github.io/cocoa-canvas/admin/auto_setup/) for detailed auto-setup documentation.

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
├── docs/               # Documentation source (Markdown)
│   ├── QUICK_START.md
│   ├── admin/          # Deployment & configuration guides
│   ├── developer/      # Architecture & technical docs
│   └── planning/       # Project planning docs
├── docs-site/          # Documentation website (Astro Starlight)
│   └── ...             # Built with custom Cocoa Canvas theme
├── .github/
│   └── workflows/      # CI/CD automation
│       ├── test.yml          # Run tests on push
│       └── deploy-docs.yml   # Auto-deploy docs to GitHub Pages
└── README.md           # You are here
```

## 🏗️ Stack

- **Frontend/Backend**: Next.js 16 (React + TypeScript)
- **Database**: Prisma ORM with PostgreSQL (dev and production)
- **Job Queue**: BullMQ with Redis for async operations
- **Testing**: Vitest with 101 tests and coverage reporting
- **Auth**: JWT + local email/password (OAuth/MFA planned for future)
- **Maps**: Leaflet + OpenStreetMap (Phase 3+)
- **Documentation**: Astro Starlight with custom theme
- **CI/CD**: GitHub Actions (automated testing & docs deployment)
- **Deployment**: Docker Compose

## 📋 Implementation Roadmap

Cocoa Canvas is built in 4 phases to MVP:

1. **Phase 1 (Weeks 1-2)** ✅ COMPLETE - Docker setup, local authentication, campaign management
2. **Phase 2 (Weeks 3-4)** ✅ COMPLETE - Person-centric voter management, import/search/filter
3. **Phase 3 (Week 5)** 🔄 IN PROGRESS - Campaign dashboard, parcel data integration, GIS services
4. **Phase 4 (Week 6)** 📋 PLANNED - Interactive maps, household clustering, team assignments — MVP

**[View detailed status and feature matrix](docs/STATUS.md)**

## 📚 Documentation

**📖 [Full Documentation Site](https://spinnernicholas.github.io/cocoa-canvas/)** - Auto-deployed from `docs/` directory

**Key Documentation:**

- **[Status & Roadmap](docs/developer/STATUS.md)** - Current implementation status and feature matrix
- **[Quick Start](https://spinnernicholas.github.io/cocoa-canvas/quick_start/)** - Get running in 5 minutes
- **[Phase 2 Completion](docs/planning/PHASE2_CONCLUSION.md)** - Person-centric architecture details
- **[Phase 3 Plan](docs/planning/PHASE3_PLAN.md)** - Current work in progress
- **[Docker Setup](https://spinnernicholas.github.io/cocoa-canvas/admin/docker_setup/)** - Production deployment guide

All documentation source files are in [`docs/`](docs/) and automatically synced to the documentation site.

## 🔒 Non-Destructive by Design

- All changes are audited
- Import rollback capability
- No hard deletes—soft deletion with audit trails
- File deduplication prevents accidental re-imports

## 🧪 Testing

The project includes comprehensive test coverage with automated CI:

```bash
cd cocoa-canvas

# Run tests
npm test

# Run tests with coverage
npm run test:ci

# Run linter
npm run lint
```

Tests automatically run on every push via GitHub Actions. Current coverage: 101 tests across authentication, API endpoints, job queue system, and business logic.
## 🤝 Contributing

Contributions welcome! (Contributing guide coming soon)

Before submitting:
1. Ensure all tests pass (`npm test`)
2. Run Prisma generation if schema changed (`npm run prisma:generate`)
3. Check the existing documentation in `docs/` for architecture guidelines

## 📄 License

GNU Affero General Public License v3 (AGPL-3.0)

## 💬 Questions?

- 📖 Browse the [full documentation site](https://spinnernicholas.github.io/cocoa-canvas/)
- 🐛 Open an [issue](https://github.com/Spinnernicholas/cocoa-canvas/issues)
- 💡 Check the [planning docs](https://spinnernicholas.github.io/cocoa-canvas/planning/project_plan/) for architecture details

---

**Ready to build?** Start with the [Phase Plan](https://spinnernicholas.github.io/cocoa-canvas/planning/phase_plan/) for the implementation roadmap.
