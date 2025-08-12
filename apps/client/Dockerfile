# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Set working directory
WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui

# Copy client app
COPY apps/client ./apps/client

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter @trading-viewer/shared build
RUN pnpm --filter @trading-viewer/ui build

# Build client application
RUN pnpm --filter @trading-viewer/client build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]