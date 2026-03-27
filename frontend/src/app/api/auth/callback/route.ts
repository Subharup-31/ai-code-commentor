import { NextResponse } from 'next/server';
import { Nango } from '@nangohq/node';
import { createOrUpdateUser } from '@/lib/db';
import { sendConnectionSuccessMessage } from '@/lib/telegram';
import { extractNangoAccessToken } from '@/lib/nangoToken';

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || '' });

export async function POST(request: Request) {
    try {
        const { telegramId, connectionId } = await request.json();

        if (!telegramId || !connectionId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        console.log(`[Auth Callback] Processing for Telegram ID: ${telegramId}, Connection ID: ${connectionId}`);

        // Verify the connection exists in Nango
        try {
            const tokenResponse = await nango.getToken('github-getting-started', connectionId);
            const token = extractNangoAccessToken(tokenResponse as any);
            
            // Fetch GitHub user info
            const githubResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });

            if (!githubResponse.ok) {
                throw new Error('Failed to fetch GitHub user info');
            }

            const githubUser = await githubResponse.json();

            // Store the mapping in database
            const user = await createOrUpdateUser({
                telegramId: telegramId,
                nangoConnectionId: connectionId,
                githubUsername: githubUser.login,
                githubUserId: githubUser.id,
            });

            console.log(`[Auth Callback] User created/updated:`, {
                telegramId: user.telegram_id,
                githubUsername: user.github_username,
            });

            // Send success message to Telegram
            await sendConnectionSuccessMessage(parseInt(telegramId), githubUser.login);

            return NextResponse.json({
                success: true,
                user: {
                    telegramId: user.telegram_id,
                    githubUsername: user.github_username,
                },
            });
        } catch (nangoError: any) {
            console.error('[Auth Callback] Nango error:', nangoError);
            return NextResponse.json(
                { error: 'Failed to verify GitHub connection' },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('[Auth Callback] Error:', error);
        return NextResponse.json(
            { error: 'Failed to complete authentication' },
            { status: 500 }
        );
    }
}
