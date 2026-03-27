import { mastra } from "@/mastra";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function extractContent(m: any): string {
    if (Array.isArray(m.parts)) {
        return m.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('');
    }
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) {
        return m.content
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('');
    }
    return '';
}

function convertUIMessagesToSimple(uiMessages: any[]): any[] {
    return uiMessages
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => ({
            id: m.id || crypto.randomUUID(),
            role: m.role,
            content: extractContent(m),
            createdAt: m.createdAt || new Date(),
        }))
        .filter((m: any) => m.content && m.content.length > 0);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // TextStreamChatTransport sends { messages, ...extraBody }
        const { messages: rawMessages, connectionId } = body;

        console.log("[Chat API] Request body keys:", Object.keys(body));
        console.log("[Chat API] connectionId:", connectionId);
        console.log("[Chat API] Raw messages count:", rawMessages?.length);
        if (rawMessages?.length > 0) {
            console.log("[Chat API] First message sample:", JSON.stringify(rawMessages[0]).substring(0, 200));
        }

        if (!rawMessages || !Array.isArray(rawMessages)) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        const masterAgent = mastra.getAgent('masterAgent');
        if (!masterAgent) {
            throw new Error("Master agent not found");
        }

        // Convert UI messages to simple format for Mastra
        const simpleMessages = convertUIMessagesToSimple(rawMessages);
        console.log("[Chat API] Converted messages:", simpleMessages.length);

        // Append context to the last user message
        const lastMessage = simpleMessages[simpleMessages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
            const contextText = connectionId && connectionId !== 'unconnected_user'
                ? `\n\n[System Note: The user's GitHub/Notion connection ID is "${connectionId}". Always pass this connectionId to your tools. Please always output a text summary after calling a tool.]`
                : `\n\n[System Note: The user has NOT connected their GitHub/Notion accounts. Do NOT call any tools. Instead, explicitly tell them: "You need to connect your GitHub account first. Please go to the Integrations page and click 'Connect GitHub'."]`;

            lastMessage.content += contextText;
        }

        console.log("[Chat API] Connection state:", connectionId && connectionId !== 'unconnected_user' ? 'CONNECTED' : 'READ-ONLY');

        const agentsToTry = ['masterAgent', 'secondaryAgent', 'fallbackAgent'];

        let responseText = '';
        let lastError: { message: string; isRateLimit?: boolean; status?: number } | null = null;

        for (const agentName of agentsToTry) {
            const agent = mastra.getAgent(agentName as any);
            if (!agent) {
                console.warn(`[Chat API] Agent ${agentName} not found`);
                continue;
            }
            try {
                console.log(`[Chat API] Attempting with: ${agentName}`);
                const gen = await agent.generate(simpleMessages);
                responseText = gen?.text ?? gen?.message?.content ?? String(gen?.message ?? '');
                if (responseText) {
                    console.log(`[Chat API] ✅ Success with ${agentName}`);
                    break;
                } else {
                    console.warn(`[Chat API] ${agentName} returned empty response, trying next agent...`);
                }
            } catch (err: any) {
                const msg = err?.message ?? String(err);
                const status = err?.status ?? err?.statusCode ?? err?.response?.status;
                const isRateLimit =
                    status === 429 ||
                    /rate limit|quota exceeded|resource exhausted|429|too many requests/i.test(msg);
                lastError = { message: msg, isRateLimit, status };
                
                // Detailed error logging
                console.error(`[Chat API] ❌ ${agentName} failed:`);
                console.error(`  - Error message: ${msg}`);
                console.error(`  - Status code: ${status || 'N/A'}`);
                console.error(`  - Full error:`, err);
                
                // Log which model is being used
                if (agentName === 'masterAgent') {
                    console.log('[Chat API] 🔄 Primary Gemini key failed, trying secondary...');
                } else if (agentName === 'secondaryAgent') {
                    console.log('[Chat API] 🔄 Secondary Gemini key failed, trying OpenRouter fallback...');
                } else if (agentName === 'fallbackAgent') {
                    console.log('[Chat API] 💥 OpenRouter fallback also failed - all options exhausted');
                }
            }
        }

        if (!responseText) {
            let userMessage =
                "All AI providers are currently unavailable. Please check your API keys (Gemini, OpenRouter) and try again.";
            if (lastError?.isRateLimit) {
                userMessage =
                    "API rate limit or quota exceeded. Please wait a few minutes and try again. If this persists, check your Gemini/OpenRouter usage limits.";
            } else if (lastError?.message) {
                const lower = lastError.message.toLowerCase();
                if (lower.includes('api key') || lower.includes('invalid') || lower.includes('unauthorized')) {
                    userMessage =
                        "Invalid or missing API key. Please verify GOOGLE_GENERATIVE_AI_API_KEY and OPENROUTER_API_KEY in your .env.local.";
                } else if (lower.includes('model') || lower.includes('not found')) {
                    userMessage =
                        "Model configuration error. The AI model may not be available. Please check your model names in llm.ts.";
                }
            }
            
            console.error('[Chat API] All agents failed. Last error:', lastError);
            
            return new Response(userMessage, {
                status: 500,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }

        // Return as plain text stream (single chunk - TextStreamChatTransport compatible)
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(responseText));
                controller.close();
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error: any) {
        console.error("[Chat API] Fatal error:", error.message, error.stack);
        return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
    }
}
