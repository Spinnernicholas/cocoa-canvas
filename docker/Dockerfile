# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install required system dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY cocoa-canvas/package.json cocoa-canvas/package-lock.json* cocoa-canvas/yarn.lock* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY cocoa-canvas/ .

# Ensure public directory exists
RUN mkdir -p public

# Prisma 7 config requires DATABASE_URL at generate time
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma client and build Next.js
RUN npx prisma generate && npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install required system dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files from builder
COPY cocoa-canvas/package.json cocoa-canvas/package-lock.json* cocoa-canvas/yarn.lock* ./

# Install production dependencies only
RUN npm ci --production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV NEXTAUTH_URL=http://localhost:3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
