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

    // Test Primary Gemini
    try {
        console.log('[Test] Testing primary Gemini model...');
        const { text } = await generateText({
            model: primaryModel,
            prompt: 'Say "OK"',
        });
        results.primary.status = text ? '✅ Working' : '⚠️ Empty response';
        console.log('[Test] Primary Gemini:', results.primary.status, '-', text);
    } catch (err: any) {
        results.primary.status = '❌ Failed';
        results.primary.error = err.message;
        console.error('[Test] Primary Gemini failed:', err.message);
    }

    // Test Secondary Gemini
    try {
        console.log('[Test] Testing secondary Gemini model...');
        const { text } = await generateText({
            model: secondaryModel,
            prompt: 'Say "OK"',
        });
        results.secondary.status = text ? '✅ Working' : '⚠️ Empty response';
        console.log('[Test] Secondary Gemini:', results.secondary.status, '-', text);
    } catch (err: any) {
        results.secondary.status = '❌ Failed';
        results.secondary.error = err.message;
        console.error('[Test] Secondary Gemini failed:', err.message);
    }

    // Test OpenRouter Fallback
    try {
        console.log('[Test] Testing OpenRouter fallback model...');
        const { text } = await generateText({
            model: fallbackModel,
            prompt: 'Say "OK"',
        });
        results.fallback.status = text ? '✅ Working' : '⚠️ Empty response';
        console.log('[Test] OpenRouter:', results.fallback.status, '-', text);
    } catch (err: any) {
        results.fallback.status = '❌ Failed';
        results.fallback.error = err.message;
        console.error('[Test] OpenRouter failed:', err.message);
    }

    return NextResponse.json({
        message: 'LLM Configuration Test Results',
        environment: {
            primaryKeySet: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            secondaryKeySet: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
            openRouterKeySet: !!process.env.OPENROUTER_API_KEY,
            keysIdentical: process.env.GOOGLE_GENERATIVE_AI_API_KEY === process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
        },
        results,
    });
}
