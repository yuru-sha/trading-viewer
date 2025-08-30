#!/bin/bash

# Monorepo deployment script
# Handles deployment for both client and server applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
DEPLOY_TARGET=${2:-all} # all, client, server

echo -e "${GREEN}🚀 Starting deployment to ${ENVIRONMENT}...${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: ./deploy.sh [staging|production] [all|client|server]"
    exit 1
fi

# Load environment variables
ENV_FILE=".env.${ENVIRONMENT}"
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✅ Loading environment from ${ENV_FILE}${NC}"
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}⚠️ Warning: ${ENV_FILE} not found, using defaults${NC}"
fi

# Function to deploy client
deploy_client() {
    echo -e "${GREEN}📦 Deploying client application...${NC}"
    
    # Build client Docker image
    docker build -f apps/client/Dockerfile -t tradingviewer-client:${ENVIRONMENT} .
    
    # Tag for registry (if using cloud registry)
    if [ -n "$DOCKER_REGISTRY" ]; then
        docker tag tradingviewer-client:${ENVIRONMENT} ${DOCKER_REGISTRY}/tradingviewer-client:${ENVIRONMENT}
        docker push ${DOCKER_REGISTRY}/tradingviewer-client:${ENVIRONMENT}
    fi
    
    echo -e "${GREEN}✅ Client deployed successfully${NC}"
}

# Function to deploy server
deploy_server() {
    echo -e "${GREEN}📦 Deploying server application...${NC}"
    
    # Run database migrations first
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    ./scripts/migrate-prod.sh
    
    # Build server Docker image
    docker build -f apps/server/Dockerfile -t tradingviewer-server:${ENVIRONMENT} .
    
    # Tag for registry (if using cloud registry)
    if [ -n "$DOCKER_REGISTRY" ]; then
        docker tag tradingviewer-server:${ENVIRONMENT} ${DOCKER_REGISTRY}/tradingviewer-server:${ENVIRONMENT}
        docker push ${DOCKER_REGISTRY}/tradingviewer-server:${ENVIRONMENT}
    fi
    
    echo -e "${GREEN}✅ Server deployed successfully${NC}"
}

# Function to deploy with Docker Compose
deploy_compose() {
    echo -e "${GREEN}🐳 Deploying with Docker Compose...${NC}"
    
    # Use environment-specific compose file if it exists
    COMPOSE_FILE="docker-compose.yml"
    if [ -f "docker-compose.${ENVIRONMENT}.yml" ]; then
        COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
    fi
    
    # Pull latest images
    docker-compose -f $COMPOSE_FILE pull
    
    # Stop existing containers
    docker-compose -f $COMPOSE_FILE down
    
    # Start new containers
    docker-compose -f $COMPOSE_FILE up -d
    
    # Wait for services to be healthy
    echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
    sleep 10
    
    # Check health status
    docker-compose -f $COMPOSE_FILE ps
    
    echo -e "${GREEN}✅ Docker Compose deployment complete${NC}"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    echo -e "${GREEN}☸️ Deploying to Kubernetes...${NC}"
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/${ENVIRONMENT}/
    
    # Wait for rollout to complete
    kubectl rollout status deployment/tradingviewer-client -n tradingviewer
    kubectl rollout status deployment/tradingviewer-server -n tradingviewer
    
    echo -e "${GREEN}✅ Kubernetes deployment complete${NC}"
}

# Main deployment logic
case $DEPLOY_TARGET in
    client)
        deploy_client
        ;;
    server)
        deploy_server
        ;;
    all)
        deploy_client
        deploy_server
        
        # Deploy with orchestration platform
        if [ -n "$USE_KUBERNETES" ] && [ "$USE_KUBERNETES" = "true" ]; then
            deploy_kubernetes
        else
            deploy_compose
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid deploy target: $DEPLOY_TARGET${NC}"
        exit 1
        ;;
esac

# Run post-deployment checks
echo -e "${YELLOW}🔍 Running post-deployment checks...${NC}"

# Check health endpoints
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:8000/health}"
if curl -f -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL | grep -q "200"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

# Send deployment notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Deployment to ${ENVIRONMENT} completed successfully!\"}" \
        $SLACK_WEBHOOK_URL
fi

echo -e "${GREEN}🎉 Deployment to ${ENVIRONMENT} completed successfully!${NC}"