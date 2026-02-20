import { defineConfig, env } from '@prisma/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const envFiles = [
  '.env',
  '.env.local',
  `.env.${process.env.NODE_ENV ?? 'development'}`,
  '.env.development',
  '.env.production',
];

for (const fileName of envFiles) {
  const filePath = join(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    continue;
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
