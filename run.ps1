#!/usr/bin/env pwsh
# Helper script to run Cocoa Canvas in dev or prod mode

param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('dev', 'prod')]
  [string]$Mode
)

if ($Mode -eq 'dev') {
  Write-Host "🚀 Starting Cocoa Canvas in DEVELOPMENT mode..." -ForegroundColor Cyan
  Write-Host "Source code hot reload enabled" -ForegroundColor Gray
  Write-Host "Visit: http://localhost:3000" -ForegroundColor Green
  Write-Host ""
  
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
  
} elseif ($Mode -eq 'prod') {
  Write-Host "🚀 Starting Cocoa Canvas in PRODUCTION mode..." -ForegroundColor Cyan
  Write-Host "Optimized production build" -ForegroundColor Gray
  Write-Host "Visit: http://localhost:3000" -ForegroundColor Green
  Write-Host ""
  
  docker-compose up
}
