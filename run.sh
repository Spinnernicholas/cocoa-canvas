#!/bin/bash
# Helper script to run Cocoa Canvas in dev or prod mode

if [ -z "$1" ]; then
  echo "Usage: ./run.sh [dev|prod]"
  echo ""
  echo "Examples:"
  echo "  ./run.sh dev      - Run in development mode with hot reload"
  echo "  ./run.sh prod     - Run in production mode"
  exit 1
fi

MODE=$1

if [ "$MODE" = "dev" ]; then
  echo "🚀 Starting Cocoa Canvas in DEVELOPMENT mode..."
  echo "Source code hot reload enabled"
  echo "Visit: http://localhost:3000"
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
  
elif [ "$MODE" = "prod" ]; then
  echo "🚀 Starting Cocoa Canvas in PRODUCTION mode..."
  echo "Optimized production build"
  echo "Visit: http://localhost:3000"
  docker-compose up
  
else
  echo "❌ Unknown mode: $MODE"
  echo "Valid modes: dev, prod"
  exit 1
fi
