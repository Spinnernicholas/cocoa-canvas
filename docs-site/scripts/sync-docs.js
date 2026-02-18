#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Convert filename to title
function filenameToTitle(filename) {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word
}

// Convert filename to slug
function filenameToSlug(filename) {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .toLowerCase()
    .replace(/_/g, '-'); // Replace underscores with hyphens
}

// Extract title from first H1 heading if present
function extractTitleFromContent(content) {
  const match = content.match(/^#\s+(.+?)$/m);
  return match ? match[1] : null;
}

// Process a single markdown file
function processFile(sourceFile, destFile, fileTitle) {
  // Ensure destination directory exists
  const destDir = path.dirname(destFile);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  let content = fs.readFileSync(sourceFile, 'utf-8');
  
  // Extract title from first H1 if available
  const extractedTitle = extractTitleFromContent(content);
  const title = extractedTitle || fileTitle;
  
  // Add frontmatter if not already present
  if (!content.startsWith('---')) {
    // Properly escape title for YAML (quote if contains special chars)
    const escapedTitle = title.includes(':') || title.includes('"') 
      ? `"${title.replace(/"/g, '\\"')}"` 
      : title;
    const frontmatter = `---\ntitle: ${escapedTitle}\n---\n\n`;
    content = frontmatter + content;
  }
  
  fs.writeFileSync(destFile, content);
  console.log(`✓ ${sourceFile} → ${destFile}`);
}

// Main sync function
function syncDocs() {
  const docsRoot = path.join(__dirname, '../../docs');
  const destRoot = path.join(__dirname, '../src/content/docs');
  
  const mapping = [
    // Getting started - Quick start guides
    { src: 'QUICK_START.md', dest: 'getting-started/01-basic.md' },
    { src: 'DEVELOPMENT.md', dest: 'getting-started/02-development.md' },
    { src: 'PRODUCTION.md', dest: 'getting-started/03-production.md' },
    { src: 'TROUBLESHOOTING.md', dest: 'getting-started/troubleshooting.md' },
    { src: 'IMPLEMENTATION.md', dest: 'getting-started/implementation.md' },
    
    // Admin
    { src: 'admin/DOCKER_SETUP.md', dest: 'admin/docker-setup.md' },
    { src: 'admin/AUTO_SETUP.md', dest: 'admin/auto-setup.md' },
    { src: 'admin/ENVIRONMENT_VARIABLES.md', dest: 'admin/environment-variables.md' },
    { src: 'admin/REDIS_SETUP.md', dest: 'admin/redis-setup.md' },
    { src: 'admin/OPTION_GROUPS.md', dest: 'admin/option-groups.md' },
    
    // Developer
    { src: 'developer/STATUS.md', dest: 'developer/status.md' },
    { src: 'developer/DATABASE_SCHEMA_MASTER.md', dest: 'developer/database-schema-master.md' },
    { src: 'developer/SCHEMA_MIGRATION_PLAN.md', dest: 'developer/schema-migration-plan.md' },
    { src: 'developer/JOB_SYSTEM_VERIFICATION.md', dest: 'developer/job-system-verification.md' },
    { src: 'developer/IMPORT_ARCHITECTURE.md', dest: 'developer/import-architecture.md' },
    { src: 'developer/VOTER_FILE_ARCHITECTURE.md', dest: 'developer/voter-file-architecture.md' },
    { src: 'developer/VOTER_FILE_FORMATS.md', dest: 'developer/voter-file-formats.md' },
    { src: 'developer/VOTER_IMPORTER_IMPLEMENTATION.md', dest: 'developer/voter-importer-implementation.md' },
    { src: 'developer/VOTER_COMPONENTS_IMPLEMENTATION.md', dest: 'developer/voter-components-implementation.md' },
    { src: 'developer/SINGLE_CAMPAIGN_ARCHITECTURE.md', dest: 'developer/single-campaign-architecture.md' },
    
    // Planning
    { src: 'planning/PHASE2_CONCLUSION.md', dest: 'planning/phase2-conclusion.md' },
    { src: 'planning/PHASE3_PLAN.md', dest: 'planning/phase3-plan.md' },
  ];
  
  console.log('🔄 Syncing documentation from ../docs to src/content/docs...\n');
  
  mapping.forEach(({ src, dest }) => {
    const sourceFile = path.join(docsRoot, src);
    const destFile = path.join(destRoot, dest);
    const title = filenameToTitle(src);
    
    if (fs.existsSync(sourceFile)) {
      processFile(sourceFile, destFile, title);
    } else {
      console.log(`⚠ ${sourceFile} not found`);
    }
  });
  
  console.log('\n✨ Documentation sync complete!');
  console.log('   Edit files in ../../docs and run this script to sync changes.');
}

syncDocs();
