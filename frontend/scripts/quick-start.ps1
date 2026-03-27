# VulnGuard AI - Quick Start Script
# This script helps you get started quickly

Write-Host "🛡️  VulnGuard AI - Quick Start Setup" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local not found!" -ForegroundColor Red
    Write-Host "Please create .env.local with required environment variables." -ForegroundColor Yellow
    Write-Host "See SETUP_GUIDE.md for details.`n" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed`n" -ForegroundColor Green
}

# Check if DATABASE_URL is set
$envContent = Get-Content ".env.local" -Raw
if ($envContent -notmatch "DATABASE_URL=") {
    Write-Host "⚠️  DATABASE_URL not found in .env.local" -ForegroundColor Yellow
    Write-Host "Database features will not work without PostgreSQL." -ForegroundColor Yellow
    Write-Host "See SETUP_GUIDE.md for database setup instructions.`n" -ForegroundColor Yellow
    
    $response = Read-Host "Continue without database? (y/n)"
    if ($response -ne "y") {
        exit 0
    }
} else {
    # Try to initialize database
    Write-Host "🗄️  Initializing database..." -ForegroundColor Yellow
    npm run db:init 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database initialized`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database initialization failed" -ForegroundColor Yellow
        Write-Host "Make sure PostgreSQL is running and DATABASE_URL is correct.`n" -ForegroundColor Yellow
    }
}

# Check if ngrok is running
Write-Host "🌐 Checking ngrok..." -ForegroundColor Yellow
$ngrokRunning = $false
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction SilentlyContinue
    if ($ngrokApi.tunnels.Count -gt 0) {
        $ngrokUrl = $ngrokApi.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
        Write-Host "✅ ngrok is running: $ngrokUrl`n" -ForegroundColor Green
        $ngrokRunning = $true
    }
} catch {
    Write-Host "⚠️  ngrok is not running" -ForegroundColor Yellow
    Write-Host "Start ngrok in another terminal: ngrok http 3000`n" -ForegroundColor Yellow
}

# Check Telegram bot token
if ($envContent -match "TELEGRAM_BOT_TOKEN=(\S+)") {
    $botToken = $matches[1]
    if ($botToken -and $botToken -ne "your_bot_token_here") {
        Write-Host "✅ Telegram bot token configured`n" -ForegroundColor Green
        
        if ($ngrokRunning) {
            Write-Host "🔗 Would you like to setup the Telegram webhook now? (y/n)" -ForegroundColor Cyan
            $response = Read-Host
            if ($response -eq "y") {
                & ".\setup-telegram-webhook.ps1"
            }
        }
    } else {
        Write-Host "⚠️  Telegram bot token not configured" -ForegroundColor Yellow
        Write-Host "Add TELEGRAM_BOT_TOKEN to .env.local`n" -ForegroundColor Yellow
    }
}

Write-Host "`n🚀 Starting development server..." -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Cyan

Write-Host "📝 Quick Tips:" -ForegroundColor Cyan
Write-Host "  • Web app: http://localhost:3000" -ForegroundColor White
Write-Host "  • API docs: http://localhost:3000/api" -ForegroundColor White
if ($ngrokRunning) {
    Write-Host "  • Public URL: $ngrokUrl" -ForegroundColor White
}
Write-Host "  • Press Ctrl+C to stop`n" -ForegroundColor White

# Start the dev server
npm run dev
