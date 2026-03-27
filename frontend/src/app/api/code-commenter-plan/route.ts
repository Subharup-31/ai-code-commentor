import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { filePath, fileContent, userPrompt } = await req.json();

    if (!filePath || !fileContent) {
      return NextResponse.json({ error: "Missing filePath or fileContent" }, { status: 400 });
    }

    const { text } = await generateText({
      model: openrouter("stepfun/step-3.5-flash:free"),
      system: `You are a friendly code documentation assistant. Your job is to create a short, clear implementation plan before adding comments to code.

Write in simple, conversational language. Be concise — 2 to 4 bullet points maximum.
Show the user WHAT you'll do but do NOT write the code yet.

Format example:
"Here's my plan for [filename]:
• Add a short header comment describing what the file does
• Add a one-line comment above each function explaining what it does in plain English
• Add inline comments for any tricky logic

Ready to proceed?"`,
      prompt: `User asked: "${userPrompt}"

File: ${filePath}
Code:
${fileContent}

Write the short implementation plan now.`,
    });

    return NextResponse.json({ plan: text });
  } catch (err: any) {
    console.error("Plan generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
