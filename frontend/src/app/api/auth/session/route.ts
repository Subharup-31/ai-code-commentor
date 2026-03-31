import { NextResponse } from 'next/server';
import { Nango } from '@nangohq/node';
import { createOAuthState } from '@/lib/db';

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || '' });

export async function POST(request: Request) {
    try {
        const { telegramId } = await request.json();

        if (!telegramId) {
            return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
        }

        // Create OAuth state for security
        const stateToken = await createOAuthState(telegramId);

        // Generate Nango connect session token
        // Use telegram ID as the connection ID
        const connectionId = `tg_${telegramId}`;

        const response = await nango.createConnectSession({
            allowed_integrations: ['github-getting-started'],
            end_user: {
                id: connectionId,
                display_name: `Telegram User ${telegramId}`,
            },
        });

        console.log(`[Auth Session] Created session for Telegram ID: ${telegramId}, Connection ID: ${connectionId}`);

        return NextResponse.json({
            connectSessionToken: response.data.token,
            stateToken: stateToken,
        });
    } catch (error: any) {
        console.error('[Auth Session] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create session' },
            { status: 500 }
        );
    }
}
