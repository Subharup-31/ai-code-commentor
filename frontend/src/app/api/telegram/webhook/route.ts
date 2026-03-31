import { NextResponse } from 'next/server';
import { masterAgent } from '@/mastra/agents/masterAgent';
import { getTelegramConnection, setTelegramConnection } from '@/lib/telegramStore';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not set.");
        return;
    }

    try {
        await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
            }),
        });
    } catch (error) {
        console.error("Failed to send Telegram message", error);
    }
}

export async function POST(request: Request) {
    try {
        console.log('[Telegram Webhook] Received POST request');
        const body = await request.json();
        console.log('[Telegram Webhook] Body:', JSON.stringify(body, null, 2));
        
        const message = body.message;

        // Ignore if no message format (e.g. edited message or callback query)
        if (!message || !message.text) {
            console.log('[Telegram Webhook] No message or text, ignoring');
            return NextResponse.json({ ok: true });
        }

        const chatId = message.chat.id;
        const text = message.text.trim();

        console.log(`[Telegram Webhook] Received message from ${chatId}: ${text}`);

        // Handle /start command
        if (text.startsWith('/start')) {
            await sendTelegramMessage(chatId, "Welcome to VulnGuard AI Bot! 🛡️\nTo use me, you must link your account by typing:\n`/connect <your-connection-id>`\n\nYou can find your connection ID in your web dashboard after connecting to GitHub.");
            return NextResponse.json({ ok: true });
        }

        // Handle /connect command
        if (text.startsWith('/connect')) {
            const parts = text.split(' ');
            if (parts.length < 2) {
                await sendTelegramMessage(chatId, "Usage: `/connect <your-connection-id>`");
                return NextResponse.json({ ok: true });
            }
            const connectionId = parts[1];
            setTelegramConnection(chatId, connectionId);
            await sendTelegramMessage(chatId, "✅ Account successfully linked! You can now ask me to list your repos, scan them, or raise PRs.");
            return NextResponse.json({ ok: true });
        }

        // Handle standard messages/prompts
        const connectionId = getTelegramConnection(chatId);

        if (!connectionId) {
            await sendTelegramMessage(chatId, "⚠️ You haven't connected your account yet. Please log into the web app, connect GitHub, and then use `/connect <connection-id>` here.");
            return NextResponse.json({ ok: true });
        }

        // Let the user know we're thinking (since AI response takes time)
        await sendTelegramMessage(chatId, "⏳ Processing your request...");

        // Forward to Mastra AI agent
        try {
            const systemPromptContext = `The user is interacting via Telegram. Their connectionId is '${connectionId}'. Always use this connectionId for tools calling.`;

            const response = await masterAgent.generate([
                { role: 'system', content: systemPromptContext },
                { role: 'user', content: text }
            ]);

            const replyText = response.text || "I processed your request, but have no text response.";

            // Note: Telegram has a 4096 character limit per message, a robust implementation
            // would split long messages here. For now, we slice it just in case.
            const safeReply = replyText.length > 4000 ? replyText.substring(0, 4000) + "\n\n...(truncated)" : replyText;

            await sendTelegramMessage(chatId, safeReply);
        } catch (error: any) {
            console.error("Error from AI agent:", error);
            await sendTelegramMessage(chatId, `❌ An error occurred while processing your request: ${error.message}`);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Error in Telegram webhook route:", error);
        console.error("Error stack:", error?.stack);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
