# Astro Starlight Docs Site for Cocoa Canvas

This is the documentation site for Cocoa Canvas built with [Astro Starlight](https://starlight.astro.build/).

The docs site automatically pulls documentation from the root `../docs` folder and generates the Starlight site.

## Getting Started

### Install Dependencies

From this directory (`docs-site/`):

```bash
npm install
```

### Development

```bash
npm run dev
```

The sync script runs automatically, pulling from `../docs/` and building the site. Visit `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The static site will be generated in the `dist/` folder.

## Editing Documentation

✍️ **Edit files in the root `docs/` folder** - the sync script handles the rest!

Just edit files like:
- `docs/admin/DOCKER_SETUP.md`
- `docs/developer/DATABASE_SCHEMA_MASTER.md`
- `docs/planning/PROJECT_PLAN.md`

Then either:
- Run `npm run sync-docs` to sync changes
- Or restart `npm run dev` (automatically syncs)

## How It Works

The `scripts/sync-docs.js` script:
1. Reads markdown files from `../docs/`
2. Adds Starlight frontmatter (title, slug) automatically
3. Generates properly-named files in `src/content/docs/`
4. Runs automatically before dev/build

This keeps a single source of truth (root `docs/` folder) while providing a beautiful web interface.

## Structure

- `src/content/docs/` - Generated docs (auto-synced from root docs)
- `scripts/sync-docs.js` - Sync script (run manually or automatically)
- `astro.config.mts` - Astro and Starlight configuration
- `package.json` - Project dependencies

## Deployment

The docs site can be deployed to any static hosting (Netlify, Vercel, GitHub Pages, etc.):

```bash
# Build the site (auto-syncs docs first)
npm run build

# The 'dist' folder contains the static site
```

For more info, see [Astro deployment docs](https://docs.astro.build/en/guides/deploy/).
