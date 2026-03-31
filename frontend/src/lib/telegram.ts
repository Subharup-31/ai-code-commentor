// Telegram Bot API utilities

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000';

export interface TelegramMessage {
    message_id: number;
    from: {
        id: number;
        is_bot: boolean;
        first_name: string;
        username?: string;
    };
    chat: {
        id: number;
        type: string;
    };
    text?: string;
}

export interface TelegramCallbackQuery {
    id: string;
    from: {
        id: number;
        first_name: string;
        username?: string;
    };
    message?: TelegramMessage;
    data?: string;
}

// Send a text message
export async function sendMessage(chatId: number, text: string, options?: {
    parse_mode?: 'Markdown' | 'HTML';
    reply_markup?: any;
}): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return;
    }

    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: options?.parse_mode || 'Markdown',
                reply_markup: options?.reply_markup,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Telegram API error:', error);
        }
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}

// Send a message with inline keyboard
export async function sendMessageWithButton(
    chatId: number,
    text: string,
    buttonText: string,
    buttonUrl: string
): Promise<void> {
    await sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                {
                    text: buttonText,
                    url: buttonUrl,
                }
            ]]
        }
    });
}

// Send welcome message with GitHub connection button
export async function sendWelcomeMessage(chatId: number, telegramUserId: number): Promise<void> {
    const connectUrl = `${WEB_APP_URL}/connect?tg_id=${telegramUserId}`;
    
    const welcomeText = `🛡️ *Welcome to VulnGuard AI Bot!*

I can help you scan GitHub repositories for security vulnerabilities and generate fixes.

To get started, connect your GitHub account by clicking the button below:`;

    await sendMessageWithButton(
        chatId,
        welcomeText,
        '🔗 Connect GitHub',
        connectUrl
    );
}

// Send connection success message
export async function sendConnectionSuccessMessage(chatId: number, githubUsername: string): Promise<void> {
    const text = `✅ *GitHub Connected Successfully!*

Your account *${githubUsername}* is now linked.

Available commands:
• \`/repos\` - List your repositories
• \`/scan <owner/repo>\` - Scan a repository
• \`/help\` - Show all commands`;

    await sendMessage(chatId, text);
}

// Send help message
export async function sendHelpMessage(chatId: number): Promise<void> {
    const text = `🛡️ *VulnGuard AI Bot - Help*

*Available Commands:*

\`/start\` - Start the bot and connect GitHub
\`/repos\` - List your GitHub repositories
\`/scan <owner/repo>\` - Scan a repository for vulnerabilities
\`/status\` - Check your connection status
\`/help\` - Show this help message

*Examples:*
\`/scan facebook/react\`
\`/scan your-username/your-repo\`

Need help? Visit our documentation or contact support.`;

    await sendMessage(chatId, text);
}

// Send repository list
export async function sendRepoList(chatId: number, repos: any[]): Promise<void> {
    if (repos.length === 0) {
        await sendMessage(chatId, '📂 You don\'t have any repositories yet.');
        return;
    }

    const repoList = repos.slice(0, 10).map((repo, index) => {
        const stars = repo.stargazers_count || 0;
        const visibility = repo.private ? '🔒' : '🌐';
        return `${index + 1}. ${visibility} *${repo.full_name}*\n   ⭐ ${stars} stars | 🍴 ${repo.forks_count || 0} forks`;
    }).join('\n\n');

    const text = `📂 *Your Repositories* (showing ${Math.min(repos.length, 10)} of ${repos.length}):\n\n${repoList}\n\nUse \`/scan <owner/repo>\` to scan a repository.`;

    await sendMessage(chatId, text);
}

// Send scan started message
export async function sendScanStartedMessage(chatId: number, repoUrl: string): Promise<void> {
    const text = `🔍 *Scan Started*

Repository: \`${repoUrl}\`

This may take a few minutes. I'll notify you when it's complete.`;

    await sendMessage(chatId, text);
}

// Send scan completed message
export async function sendScanCompletedMessage(
    chatId: number,
    repoUrl: string,
    summary: { total: number; critical: number; high: number; medium: number; low: number }
): Promise<void> {
    const text = `✅ *Scan Completed*

Repository: \`${repoUrl}\`

*Results:*
🔴 Critical: ${summary.critical}
🟠 High: ${summary.high}
🟡 Medium: ${summary.medium}
🟢 Low: ${summary.low}

Total vulnerabilities: ${summary.total}

View detailed results in the web dashboard.`;

    await sendMessage(chatId, text);
}

// Send error message
export async function sendErrorMessage(chatId: number, error: string): Promise<void> {
    const text = `❌ *Error*\n\n${error}`;
    await sendMessage(chatId, text);
}

// Send not connected message
export async function sendNotConnectedMessage(chatId: number, telegramUserId: number): Promise<void> {
    const connectUrl = `${WEB_APP_URL}/connect?tg_id=${telegramUserId}`;
    
    const text = `⚠️ *GitHub Not Connected*

You need to connect your GitHub account first.`;

    await sendMessageWithButton(
        chatId,
        text,
        '🔗 Connect GitHub',
        connectUrl
    );
}

// Answer callback query (for inline buttons)
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN) return;

    try {
        await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text,
            }),
        });
    } catch (error) {
        console.error('Failed to answer callback query:', error);
    }
}

// Verify Telegram webhook request (security)
export function verifyTelegramWebhook(request: Request): boolean {
    // In production, verify the request using Telegram's secret token
    // For now, we'll do basic validation
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secretToken) return true; // Skip verification if not configured

    const headerToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    return headerToken === secretToken;
}

// Set webhook (for initial setup)
export async function setWebhook(webhookUrl: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return false;
    }

    try {
        const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query'],
                secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
            }),
        });

        const result = await response.json();
        return result.ok;
    } catch (error) {
        console.error('Failed to set webhook:', error);
        return false;
    }
}
