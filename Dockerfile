# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Ensure public directory exists
RUN mkdir -p public

# Generate Prisma client and build Next.js
RUN npx prisma generate && npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy package files from builder
COPY package.json package-lock.json* yarn.lock* ./

# Install production dependencies only
RUN npm ci --production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create data directory for SQLite
RUN mkdir -p /app/data && chmod 755 /app/data

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
