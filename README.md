# Cocoa Canvas

**An open-source, self-hosted voter database and canvassing platform that gives political campaigns and community organizations a modern alternative to expensive proprietary platforms.**

[![Tests](https://github.com/Spinnernicholas/cocoa-canvas/actions/workflows/test.yml/badge.svg)](https://github.com/Spinnernicholas/cocoa-canvas/actions/workflows/test.yml)
[![Docs](https://github.com/Spinnernicholas/cocoa-canvas/actions/workflows/deploy-docs.yml/badge.svg)](https://spinnernicholas.github.io/cocoa-canvas/)

## Overview

Cocoa Canvas is a tool for managing voter data, conducting targeted outreach campaigns, and coordinating field operations—all while maintaining complete control over your data and operations. Built for transparency, privacy, and ease of use.

📖 **[View Full Documentation](https://spinnernicholas.github.io/cocoa-canvas/)** - Complete guides, architecture docs, and planning information

## ✨ Features

- **Voter Database Management** - Import, search, and manage voter records
- **Interactive Mapping** - Leaflet-based maps showing voter locations and precincts
- **Canvassing Coordination** - Assign voters to teams and track outreach
- **Data Imports with Audit** - File uploads with validation and full audit trails
- **Export & Analysis** - Export voter lists and campaign data
- **Privacy-First** - Role-based access control, encrypted data, audit logging

## 🚀 Quick Start

**New to the project?** Start here:
- 📖 [**Full Documentation Site**](https://spinnernicholas.github.io/cocoa-canvas/) - Browse all guides and docs
- 🏃 [**Quick Start Guide**](docs/QUICK_START.md) - 5 minutes to running locally

**Local Development:**
```bash
# Clone the repository
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas/cocoa-canvas

# Install dependencies and start dev server
npm install
npm run dev
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
- **Database**: Prisma ORM (SQLite dev, PostgreSQL production)
- **Testing**: Vitest with 101 tests and coverage reporting
- **Auth**: Local email/password (Phase 1), OAuth/MFA planned
- **Maps**: Leaflet + OpenStreetMap
- **Documentation**: Astro Starlight with custom theme
- **CI/CD**: GitHub Actions (automated testing & docs deployment)
- **Deployment**: Docker Compose

## 📋 Implementation Roadmap

Cocoa Canvas is built in 4 phases over 8 weeks to MVP:

1. **Phase 1 (Weeks 1-2)**: Docker setup, local authentication, campaign management
2. **Phase 2 (Weeks 3-4)**: Voter import, search/filter, export
3. **Phase 3 (Weeks 5-6)**: GeoJSON import, address geocoding
4. **Phase 4 (Weeks 7-8)**: Interactive map, household clustering, assignments — **MVP**

## 📚 Documentation

**📖 [Full Documentation Site](https://spinnernicholas.github.io/cocoa-canvas/)** - Auto-deployed from `docs/` directory

**Key Documentation:**

- **[Quick Start](https://spinnernicholas.github.io/cocoa-canvas/quick_start/)** - Get running in 5 minutes
- **[Phase Plan](https://spinnernicholas.github.io/cocoa-canvas/planning/phase_plan/)** - Detailed 4-phase implementation roadmap
- **[Project Plan](https://spinnernicholas.github.io/cocoa-canvas/planning/project_plan/)** - Vision, tech stack, deployment scenarios
- **[Database Schema](https://spinnernicholas.github.io/cocoa-canvas/planning/database_schema/)** - Complete Prisma schema design
- **[API Plan](https://spinnernicholas.github.io/cocoa-canvas/planning/api_plan/)** - REST API specification (50+ endpoints)
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
