import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://Spinnernicholas.github.io/cocoa-canvas/',
  base: '/cocoa-canvas/',
  integrations: [
    starlight({
      title: 'Cocoa Canvas',
      description: 'Open-source voter database and canvassing platform',
      social: [
        { label: 'GitHub', icon: 'github', href: 'https://github.com/Spinnernicholas/cocoa-canvas' },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Admin & Deployment',
          autogenerate: { directory: 'admin' },
        },
        {
          label: 'Developer Guide',
          autogenerate: { directory: 'developer' },
        },
        {
          label: 'Planning & Architecture',
          collapsed: true,
          autogenerate: { directory: 'planning' },
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/Spinnernicholas/cocoa-canvas/edit/main/docs/',
      },
    }),
  ],
});
