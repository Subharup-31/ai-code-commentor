import { createOpenAI } from '@ai-sdk/openai';

// OpenRouter configuration
const openRouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
});

// Log configuration status (only runs once at startup)
if (process.env.NODE_ENV !== 'production') {
    console.log('\n=== LLM Configuration ===');
    console.log('[LLM Config] OpenRouter key:', process.env.OPENROUTER_API_KEY ? `✅ Set (${process.env.OPENROUTER_API_KEY.substring(0, 20)}...)` : '❌ Missing');
    console.log('========================\n');
}

const CHOSEN_MODEL = process.env.OPENROUTER_MODEL || 'stepfun/step-3.5-flash:free';

// Primary model: Chosen Model via OpenRouter
export const primaryModel = openRouter(CHOSEN_MODEL);

// Secondary model: same (OpenRouter handles load balancing)
export const secondaryModel = openRouter(CHOSEN_MODEL);

// Fallback model: same free model
export const fallbackModel = openRouter(CHOSEN_MODEL);
