# Cocoa Canvas Documentation Site

The public documentation website for Cocoa Canvas, built with Astro Starlight.

## Overview

This is the **single source of truth** for all public documentation including:

- Getting started guides (Basic, Development, Production)
- Admin & deployment guides
- Developer documentation & architecture
- Implementation status & feature matrix
- Planning & reference materials

The site is auto-deployed to GitHub Pages whenever documentation is committed to the main branch.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Local Development

```bash
npm run dev
```

The site will be available at http://localhost:3000

### Build for Production

```bash
npm run build
```

Output is generated in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
docs-site/
├── src/
│   ├── content/
│   │   └── docs/                    # All documentation markdown files
│   │       ├── getting-started/     # Quick start guides
│   │       │   ├── 01-basic.md      # 5-minute quick start
│   │       │   ├── 02-development.md # Dev environment setup
│   │       │   ├── 03-production.md  # Production deployment
│   │       │   ├── implementation.md # Feature status matrix
│   │       │   └── troubleshooting.md
│   │       ├── admin/               # Admin & deployment
│   │       │   ├── auto-setup.md
│   │       │   ├── docker-setup.md
│   │       │   ├── environment-variables.md
│   │       │   ├── option-groups.md
│   │       │   └── redis-setup.md
│   │       ├── developer/           # Developer documentation
│   │       │   ├── status.md
│   │       │   ├── database-schema.md
│   │       │   ├── single-campaign-architecture.md
│   │       │   ├── import-architecture.md
│   │       │   ├── job-system-verification.md
│   │       │   ├── voter-file-formats.md
│   │       │   └── file-schemas/    # Specific file format specs
│   │       │       ├── basic-csv.md
│   │       │       └── contra-costa.md
│   │       └── planning/            # Archived planning docs
│   │           ├── project-plan.md
│   │           ├── phase-plan.md
│   │           ├── phase2-conclusion.md
│   │           ├── phase3-plan.md
│   │           └── ...
│   └── styles/                      # Custom CSS
│       └── theme.css
├── astro.config.mts                 # Astro configuration
├── package.json
├── tsconfig.json
└── README.md                        # This file
```

## Content Management

### Adding a New Document

1. Create a markdown file in the appropriate folder under `src/content/docs/`
2. Add frontmatter with title:

```markdown
---
title: Your Page Title
---

# Your Page Title

Content here...
```

3. The sidebar will automatically generate based on file structure

### File Naming

- Use lowercase with hyphens: `my-guide.md`
- Prefix getting-started guides with numbers for ordering: `01-basic.md`, `02-development.md`
- Directories are included in sidebar automatically

### Sidebar Navigation

The sidebar auto-generates from `src/content/docs/` structure by folder:

- **Getting Started** - from `getting-started/` (ordered by filename)
- **Admin & Deployment** - from `admin/`
- **Developer Guide** - from `developer/` (has subdirectories like `file-schemas/`)
- **Planning & Architecture** - from `planning/` (collapsed by default)

See `astro.config.mts` for sidebar configuration.

## Build & Deployment

### GitHub Pages Deployment

The site is automatically deployed to https://Spinnernicholas.github.io/cocoa-canvas/ whenever changes are pushed to `main`.

Deployment is configured in `.github/workflows/` and uses:
- Astro static site generator
- GitHub Pages hosting
- Base path: `/cocoa-canvas/`

### Build Process

```bash
# Development build (watches for changes)
npm run dev

# Production build (optimized, no source maps)
npm run build

# Preview production build locally
npm run preview

# Check for issues
npm run check
```

## Configuration

### Astro Config (astro.config.mts)

Key settings:

```typescript
site: 'https://Spinnernicholas.github.io/'
base: '/cocoa-canvas/'
```

The `base: '/cocoa-canvas/'` means all internal links must include this prefix:

```markdown
[Link](/cocoa-canvas/getting-started/01-basic/)
```

### Starlight Configuration

Starlight handles the documentation theme, search, and sidebar. Configuration is in `astro.config.mts`:

```typescript
starlight({
  title: 'Cocoa Canvas',
  description: 'Open-source voter database and canvassing platform',
  customCss: ['./src/styles/theme.css'],
  sidebar: [
    // Auto-generated from src/content/docs/ structure
    {
      label: 'Getting Started',
      autogenerate: { directory: 'getting-started' },
    },
    // ...
  ],
})
```

## Styling

### Custom Theme

Modify `src/styles/theme.css` to customize the Starlight theme:

```css
:root {
  --sl-color-text-accent: hsl(322, 100%, 50%);
  --sl-color-accent: hsl(322, 100%, 50%);
}
```

See [Starlight docs](https://starlight.astro.build/) for all available CSS variables.

### Dark Mode

Starlight automatically supports dark mode. Users can toggle via the theme switcher in the header.

## Search

Full-text search is powered by Pagefind and runs on every page automatically. Users can use the search icon in the header.

## Common Tasks

### Update a Guide

1. Edit the markdown file in `src/content/docs/`
2. Changes appear immediately in dev mode (`npm run dev`)
3. Commit and push to `main`
4. GitHub Actions will deploy automatically

### Update Sidebar Order

The Getting Started menu displays guides in alphabetical order. Use numeric prefixes:

- `01-basic.md` → Quick Start
- `02-development.md` → Development
- `03-production.md` → Production
- `implementation.md` → Implementation (after 03)
- `troubleshooting.md` → Troubleshooting

### Add New Documentation Section

1. Create a new folder under `src/content/docs/` (e.g., `src/content/docs/tutorials/`)
2. Add markdown files to the folder
3. Add to `astro.config.mts` sidebar configuration:

```typescript
{
  label: 'Tutorials',
  autogenerate: { directory: 'tutorials' },
},
```

4. Rebuild to update sidebar

### Link Between Pages

Use the `/cocoa-canvas/` base path for internal links:

```markdown
[Installation Guide](/cocoa-canvas/getting-started/01-basic/)
[Architecture Details](/cocoa-canvas/developer/single-campaign-architecture/)
```

## Environmental Variables

None required for documentation site. All content is static.

## Troubleshooting

### Build Fails

Check for:
- Missing frontmatter in markdown files
- Broken links
- Invalid markdown syntax

Run check:
```bash
npm run check
```

### Links Not Working

Verify all internal links include the `/cocoa-canvas/` base path:

```markdown
# ✓ Correct
[Link](/cocoa-canvas/getting-started/01-basic/)

# ✗ Wrong (missing base path)
[Link](/getting-started/01-basic/)
```

### Search Not Working

Pagefind builds during `npm run build`. For local testing:

```bash
npm run build
npm run preview
```

Then search should work.

### Sidebar Not Showing New Page

1. Ensure markdown file has proper frontmatter:
```markdown
---
title: Page Title
---
```

2. File must be in a configured directory (`getting-started/`, `admin/`, `developer/`, `planning/`)

3. Rebuild the site:
```bash
npm run build
```

## Dependencies

Key packages:

- **astro** - Static site generator
- **@astrojs/starlight** - Documentation theme
- **TypeScript** - Type safety

## Performance

- **Static generation** - All pages pre-rendered to HTML
- **Zero JavaScript** by default (interactive components optional)
- **Fast search** - Client-side search with Pagefind
- **Optimized images** - Astro Image component

Build time: ~1-2 seconds
Deployed size: ~5MB

## Security

- No server-side code
- No database connections
- No private endpoints
- All content is public

## Updating Starlight Theme

This site uses a recent version of Astro Starlight. To update:

```bash
npm update @astrojs/starlight astro
```

See [Starlight documentation](https://starlight.astro.build/) for new features and breaking changes.

## Contributing

1. Edit markdown files in `src/content/docs/`
2. Test locally: `npm run dev`
3. Commit with clear messages
4. Push to main, deployment is automatic

## Documentation Strategy

This site is the **single source of truth** for public documentation.

**GitHub-specific docs** (API details, implementation notes, quick references) can be in README.md files in respective project folders:

- `cocoa-canvas/README.md` - Next.js app documentation
- `docker/README.md` - Docker deployment guide
- `scripts/README.md` - Build scripts documentation
- `lib/*/README.md` - Library-specific documentation

## Questions?

See the main project [README](../README.md) for architecture and contributing guidelines.
