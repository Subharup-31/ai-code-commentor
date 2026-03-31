import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { primaryModel, secondaryModel, fallbackModel } from '@/mastra/llm';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results = {
        primary: { status: 'unknown', error: null as string | null },
        secondary: { status: 'unknown', error: null as string | null },
        fallback: { status: 'unknown', error: null as string | null },
    };

    // Test Primary OpenRouter model
    try {
        console.log('[Test] Testing primary OpenRouter model...');
        const { text } = await generateText({
            model: primaryModel,
            prompt: 'Say "OK"',
        });
        results.primary.status = text ? '✅ Working' : '⚠️ Empty response';
        console.log('[Test] Primary OpenRouter:', results.primary.status, '-', text);
    } catch (err: any) {
        results.primary.status = '❌ Failed';
        results.primary.error = err.message;
        console.error('[Test] Primary OpenRouter failed:', err.message);
    }

    // Test Secondary OpenRouter model
    try {
        console.log('[Test] Testing secondary OpenRouter model...');
        const { text } = await generateText({
            model: secondaryModel,
            prompt: 'Say "OK"',
        });
        results.secondary.status = text ? '✅ Working' : '⚠️ Empty response';
        console.log('[Test] Secondary OpenRouter:', results.secondary.status, '-', text);
    } catch (err: any) {
        results.secondary.status = '❌ Failed';
        results.secondary.error = err.message;
        console.error('[Test] Secondary OpenRouter failed:', err.message);
    }

    // Test OpenRouter Fallback
    try {
        console.log('[Test] Testing OpenRouter fallback model...');
        const { text } = await generateText({
            model: fallbackModel,
            prompt: 'Say "OK"',
        });
        results.fallback.status = text ? '✅ Working' : '⚠️ Empty response';
        console.log('[Test] OpenRouter fallback:', results.fallback.status, '-', text);
    } catch (err: any) {
        results.fallback.status = '❌ Failed';
        results.fallback.error = err.message;
        console.error('[Test] OpenRouter fallback failed:', err.message);
    }

    return NextResponse.json({
        message: 'LLM Configuration Test Results',
        environment: {
            openRouterKeySet: !!process.env.OPENROUTER_API_KEY,
            openRouterModel: process.env.OPENROUTER_MODEL || 'stepfun/step-3.5-flash:free (default)',
        },
        results,
    });
}
