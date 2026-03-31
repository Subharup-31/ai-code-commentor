import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { filePath, fileContent, prompt } = await req.json();

    // Add line numbers to the original code so the AI can reference them
    const numberedCode = fileContent
      .split('\n')
      .map((line: string, index: number) => `${index + 1}: ${line}`)
      .join('\n');

    const result = await streamText({
      model: openrouter("stepfun/step-3.5-flash:free"),
      system: `You are a friendly code documentation assistant. Your job is to add clear, easy-to-understand comments to code.

RULES:
- Write comments in simple, everyday English — as if explaining to a beginner
- Avoid technical jargon; use plain words
- For each function: explain what it does, what goes in (inputs), and what comes out (output)
- For complex logic: add a short inline comment explaining what's happening and WHY
- Keep comments concise — one or two lines max per comment
- Do NOT return the full source code or change any logic.
- ONLY return the comments you want to add, indicating the line number BEFORE which the comment should be inserted. Use this format:
Line [Number]: [// Your comment]

Example output:
Line 5: // This function calculates the total price
Line 12: // Loop through all items to sum them up`,
      prompt: `User Prompt: ${prompt}\n\nFile Path: ${filePath}\n\nOriginal Code (with line numbers):\n\n${numberedCode}`,
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error("AI Streaming Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
