# TradingViewer Deployment Guide

This document provides comprehensive instructions for deploying the TradingViewer application to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker and Docker Compose
- pnpm (for local builds)
- Node.js 18+
- PostgreSQL 15+
- Redis (optional)

### Required Environment Variables

Copy the appropriate `.env.{environment}.example` file and update with your values:

```bash
# For staging
cp .env.staging.example .env.staging

# For production
cp .env.production.example .env.production
```

## Environment Configuration

### Staging Environment

- **URL**: https://staging.tradingviewer.com
- **Database**: Staging PostgreSQL instance
- **Logging Level**: debug
- **Feature Flags**: All enabled for testing

### Production Environment

- **URL**: https://tradingviewer.com
- **Database**: Production PostgreSQL cluster
- **Logging Level**: info
- **Feature Flags**: Stable features only

## Docker Deployment

### Quick Start

1. **Build and start all services**:

   ```bash
   pnpm build:docker
   docker-compose up -d
   ```

2. **Check service status**:

   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

3. **Health checks**:
   ```bash
   curl http://localhost/health
   curl http://localhost:8000/health/detailed
   ```

### Environment-Specific Deployment

#### Staging Deployment

```bash
# Using deployment script
pnpm deploy:staging

# Or manually
docker-compose -f docker-compose.staging.yml up -d
```

#### Production Deployment

```bash
# Using deployment script
pnpm deploy:production

# Or manually
docker-compose -f docker-compose.yml up -d
```

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   nginx:alpine  │    │   node:18-alpine│    │postgres:15-alpine│
│                 │    │                 │    │                 │
│   Client App    │───▶│   Server App    │───▶│    Database     │
│   (Port 80)     │    │   (Port 8000)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │  redis:7-alpine │
                    │                 │
                    │     Cache       │
                    │   (Port 6379)   │
                    └─────────────────┘
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Ingress controller (nginx)
- Certificate manager (cert-manager)

### Deploy to Kubernetes

1. **Create namespace**:

   ```bash
   kubectl create namespace tradingviewer
   ```

2. **Apply secrets**:

   ```bash
   kubectl create secret generic tradingviewer-secrets \
     --from-env-file=.env.production \
     --namespace=tradingviewer
   ```

3. **Deploy applications**:

   ```bash
   kubectl apply -f k8s/production/ --namespace=tradingviewer
   ```

4. **Check deployment status**:
   ```bash
   kubectl get pods -n tradingviewer
   kubectl rollout status deployment/tradingviewer-client -n tradingviewer
   kubectl rollout status deployment/tradingviewer-server -n tradingviewer
   ```

### Kubernetes Resources

- **Deployments**: Client, Server applications
- **Services**: Load balancers for applications
- **ConfigMaps**: Non-sensitive configuration
- **Secrets**: API keys, database credentials
- **Ingress**: HTTPS termination and routing
- **PersistentVolumes**: Database storage

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

The unified CI/CD pipeline consists of:

1. **Quality Assurance**:
   - Code linting and type checking
   - Unit, integration, and E2E tests
   - Security scanning
   - Performance testing (Lighthouse)

2. **Build Stage** (main/develop branches):
   - Build Docker images for client and server
   - Push images to GitHub Container Registry
   - Tag images with branch name and commit SHA

3. **Deploy Stage**:
   - **Staging**: Auto-deploy on `develop` branch push
   - **Production**: Manual deployment using provided artifacts

4. **Artifacts** (main branch):
   - Docker images: `ghcr.io/{repo}-client:main-{sha}`, `ghcr.io/{repo}-server:main-{sha}`
   - Deployment package with scripts and configuration templates

### Manual Production Deployment

For production deployment, use the provided scripts and Docker images:

```bash
# 1. Download deployment package from GitHub Actions artifacts
# 2. Extract the package on production server
tar -xzf tradingviewer-deployment-{commit-hash}.tar.gz

# 3. Configure production environment
cp .env.production.example .env.production
# Edit .env.production with actual values

# 4. Run production deployment
./scripts/deploy.sh production

# Alternative: Step-by-step deployment
docker-compose pull                    # Pull latest images
./scripts/migrate-prod.sh             # Run database migrations
docker-compose up -d                  # Start services
curl http://localhost:8000/health     # Verify health
```

### Automated Staging Deployment

Staging deployments are automated via CI/CD:

```bash
# Triggers automatic staging deployment
git push origin develop
```

### Database Migrations

Migrations are handled automatically during deployment:

```bash
# Manual migration
./scripts/migrate-prod.sh

# With backup
BACKUP_BEFORE_MIGRATION=true ./scripts/migrate-prod.sh
```

## Monitoring and Logging

### Health Check Endpoints

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Liveness Probe**: `GET /health/live`
- **Readiness Probe**: `GET /health/ready`
- **Metrics**: `GET /metrics` (Prometheus format)

### Logging

Logs are structured in JSON format and include:

- Application logs (Winston)
- HTTP request logs
- Error tracking (Sentry)
- Performance metrics

**Log Locations**:

- Container logs: `docker-compose logs`
- File logs: `./logs/` directory
- Centralized: Sentry dashboard

### Monitoring Stack

- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Error Tracking**: Sentry
- **Uptime**: Health check endpoints
- **Performance**: Lighthouse CI

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database container
docker-compose logs postgres

# Verify connection
docker-compose exec server npx prisma db pull
```

#### 2. Frontend Build Errors

```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and rebuild
pnpm clean && pnpm install
pnpm --filter @trading-viewer/client build
```

#### 3. WebSocket Connection Issues

```bash
# Check server logs
docker-compose logs server

# Verify WebSocket endpoint
wscat -c ws://localhost:8000/ws
```

#### 4. Memory Issues

```bash
# Check container resources
docker stats

# Increase memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

### Rollback Procedure

#### Docker Compose Rollback

```bash
# Use specific image tag
docker-compose down
docker-compose pull
docker-compose up -d
```

#### Kubernetes Rollback

```bash
# Rollback to previous revision
kubectl rollout undo deployment/tradingviewer-server -n tradingviewer
kubectl rollout undo deployment/tradingviewer-client -n tradingviewer
```

### Performance Optimization

#### Database

- Connection pooling: `MAX_POOL_SIZE=20`
- Query optimization: Enable slow query logging
- Indexing: Critical queries have proper indexes

#### Application

- Caching: Redis for frequent queries
- Compression: gzip enabled
- CDN: Static assets served from CDN

#### Monitoring

- Core Web Vitals < 2.5s
- API response time < 200ms
- Database query time < 100ms

## Security Considerations

- HTTPS enforced in production
- Security headers configured
- API rate limiting enabled
- Input validation with Zod schemas
- JWT tokens with secure secrets
- Database credentials encrypted
- Regular security updates

## Support

For deployment issues:

1. Check logs: `docker-compose logs`
2. Verify health endpoints
3. Review environment variables
4. Contact DevOps team

For more information, see:

- [Development Guide](README.md)
- [API Documentation](API.md)
- [Testing Guide](TESTING_COVERAGE.md)
