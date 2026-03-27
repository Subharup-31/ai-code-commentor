# Telegram Webhook Setup Script
# This script sets up the Telegram webhook with your ngrok URL

param(
    [Parameter(Mandatory=$false)]
    [string]$NgrokUrl
)

$BOT_TOKEN = $env:TELEGRAM_BOT_TOKEN
if (-not $BOT_TOKEN) {
    Write-Host "❌ TELEGRAM_BOT_TOKEN not found in environment variables" -ForegroundColor Red
    Write-Host "Please set it in your .env.local file and restart your terminal" -ForegroundColor Yellow
    exit 1
}

# If no URL provided, try to get it from ngrok API
if (-not $NgrokUrl) {
    Write-Host "🔍 Fetching ngrok URL from local API..." -ForegroundColor Cyan
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -UseBasicParsing
        $NgrokUrl = $ngrokApi.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
        
        if (-not $NgrokUrl) {
            Write-Host "❌ No ngrok tunnel found. Please start ngrok first:" -ForegroundColor Red
            Write-Host "   ngrok http 3000" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "❌ Could not connect to ngrok API. Is ngrok running?" -ForegroundColor Red
        Write-Host "   Start ngrok with: ngrok http 3000" -ForegroundColor Yellow
        exit 1
    }
}

$WEBHOOK_URL = "$NgrokUrl/api/telegram/webhook"

Write-Host "🚀 Setting up Telegram webhook..." -ForegroundColor Green
Write-Host "   Bot Token: $($BOT_TOKEN.Substring(0,20))..." -ForegroundColor Gray
Write-Host "   Webhook URL: $WEBHOOK_URL" -ForegroundColor Gray

# Set the webhook
$body = @{
    url = $WEBHOOK_URL
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing

    if ($response.ok) {
        Write-Host "✅ Webhook successfully configured!" -ForegroundColor Green
        
        # Get webhook info
        $info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" -UseBasicParsing
        
        Write-Host "`n📊 Webhook Status:" -ForegroundColor Cyan
        Write-Host "   URL: $($info.result.url)" -ForegroundColor White
        Write-Host "   Pending Updates: $($info.result.pending_update_count)" -ForegroundColor White
        
        if ($info.result.last_error_message) {
            Write-Host "   ⚠️  Last Error: $($info.result.last_error_message)" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ No errors" -ForegroundColor Green
        }
        
        Write-Host "`n🎉 Your Telegram bot is ready!" -ForegroundColor Green
        Write-Host "   Open Telegram and search for: @VulnGuardAIBot" -ForegroundColor Cyan
        Write-Host "   Send /start to begin" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Failed to set webhook: $($response.description)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error setting webhook: $_" -ForegroundColor Red
    exit 1
}
