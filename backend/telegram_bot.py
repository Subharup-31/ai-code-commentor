"""
VulnGuard AI — Telegram Bot
Allows users to scan repositories via Telegram.
"""

import os
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv
import httpx

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send welcome message when /start is issued."""
    welcome_text = (
        "🛡️ *VulnGuard AI Bot*\n\n"
        "I can scan GitHub repositories for security vulnerabilities!\n\n"
        "📝 *Commands:*\n"
        "/scan <repo_url> - Scan a GitHub repository\n"
        "/help - Show this help message\n\n"
        "Example:\n"
        "`/scan https://github.com/user/repo`"
    )
    await update.message.reply_text(welcome_text, parse_mode="Markdown")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send help message."""
    await start(update, context)


async def scan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /scan command."""
    if not context.args:
        await update.message.reply_text(
            "❌ Please provide a GitHub repository URL.\n\n"
            "Example: `/scan https://github.com/user/repo`",
            parse_mode="Markdown"
        )
        return

    repo_url = context.args[0]
    
    # Validate URL
    if not repo_url.startswith("https://github.com/"):
        await update.message.reply_text(
            "❌ Invalid URL. Please provide a valid GitHub repository URL.\n\n"
            "Example: `https://github.com/user/repo`",
            parse_mode="Markdown"
        )
        return

    # Send processing message
    processing_msg = await update.message.reply_text(
        "🔍 Scanning repository...\n"
        "This may take a few minutes. Please wait."
    )

    try:
        # Call backend API
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/scan-repo",
                json={"repo_url": repo_url}
            )
            
            if response.status_code != 200:
                await processing_msg.edit_text(
                    f"❌ Scan failed: {response.text}"
                )
                return

            data = response.json()
            
            # Format results
            total = data["total_vulnerabilities"]
            severity = data["severity_counts"]
            
            result_text = (
                f"✅ *Scan Complete*\n\n"
                f"🔗 Repository: `{repo_url}`\n"
                f"🐛 Total Vulnerabilities: *{total}*\n\n"
                f"📊 *Severity Breakdown:*\n"
                f"🔴 Critical: {severity.get('Critical', 0)}\n"
                f"🟠 High: {severity.get('High', 0)}\n"
                f"🟡 Medium: {severity.get('Medium', 0)}\n"
                f"🟢 Low: {severity.get('Low', 0)}\n\n"
            )
            
            # Add top 5 vulnerabilities
            if data["vulnerabilities"]:
                result_text += "🔝 *Top Vulnerabilities:*\n\n"
                for i, vuln in enumerate(data["vulnerabilities"][:5], 1):
                    result_text += (
                        f"{i}. {vuln['severity']} - {vuln['issue']}\n"
                        f"   📄 File: `{vuln['file']}`\n"
                        f"   📍 Line: {vuln['line']}\n\n"
                    )
            
            await processing_msg.edit_text(result_text, parse_mode="Markdown")

    except httpx.TimeoutException:
        await processing_msg.edit_text(
            "❌ Scan timed out. The repository might be too large."
        )
    except Exception as e:
        await processing_msg.edit_text(
            f"❌ Error during scan: {str(e)}"
        )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular messages."""
    text = update.message.text
    
    if text.startswith("https://github.com/"):
        # Auto-scan if user sends a GitHub URL
        context.args = [text]
        await scan_command(update, context)
    else:
        await update.message.reply_text(
            "Send me a GitHub repository URL to scan, or use /help for more info."
        )


def main():
    """Start the bot."""
    if not TELEGRAM_BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN not found in .env file")
        print("Please add your bot token from @BotFather")
        return

    print("🤖 Starting VulnGuard AI Telegram Bot...")
    
    # Create application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("scan", scan_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Start bot
    print("✅ Bot is running! Press Ctrl+C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
