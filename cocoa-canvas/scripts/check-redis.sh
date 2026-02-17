#!/bin/bash

# Redis Health Check Script for Cocoa Canvas
# Checks if Redis is running and provides setup instructions if not

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking Redis connection..."

# Check if Redis URL is set
if [ -z "$REDIS_URL" ]; then
    REDIS_URL="redis://localhost:6379"
    echo "Using default Redis URL: $REDIS_URL"
fi

# Check if redis-tools is installed
echo "Checking for redis-cli..."
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}❌ redis-tools is not installed${NC}"
    echo ""
    echo "To install redis-tools:"
    echo ""
    echo -e "${YELLOW}macOS:${NC}"
    echo "  brew install redis"
    echo ""
    echo -e "${YELLOW}Ubuntu/Debian:${NC}"
    echo "  sudo apt install redis-tools"
    echo ""
    echo -e "${YELLOW}Or use Docker:${NC}"
    echo "  npm run docker:dev:up"
    echo ""
    exit 1
fi

# Try to connect to Redis
if redis-cli -u "$REDIS_URL" ping &> /dev/null; then
    echo -e "${GREEN}✅ Redis is running and accessible${NC}"
    echo ""
    redis-cli -u "$REDIS_URL" INFO server | grep "redis_version"
    echo ""
    exit 0
fi

# Redis is not accessible
echo -e "${RED}❌ Redis is not accessible${NC}"
echo ""
echo "To start Redis for development:"
echo ""
echo -e "${YELLOW}Option 1: Docker Compose (Recommended)${NC}"
echo "  npm run docker:dev:up"
echo ""
echo -e "${YELLOW}Option 2: Local Installation${NC}"
echo "  macOS:   brew install redis && brew services start redis"
echo "  Ubuntu:  sudo apt install redis-server && sudo systemctl start redis"
echo ""
echo "After starting Redis, run this script again or start your app:"
echo "  npm run dev"
echo ""

exit 1
