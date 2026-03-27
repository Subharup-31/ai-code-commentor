import { NextResponse } from "next/server";
import { Nango } from "@nangohq/node";
import { extractNangoAccessToken } from "@/lib/nangoToken";

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || "" });
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { repo_url, connection_id } = body;

        if (!repo_url) {
            return NextResponse.json({ error: "Missing repo_url" }, { status: 400 });
        }

        // Resolve GitHub token: try Nango first, fall back to env token
        let github_token: string | null = null;
        if (connection_id) {
            try {
                const token = await nango.getToken("github-getting-started", connection_id);
                github_token = extractNangoAccessToken(token as any);
            } catch (err: any) {
                console.warn("[scan] Could not fetch Nango token:", err.message);
                // Non-fatal — backend will fall back to its own GITHUB_TOKEN env
            }
        }

        const backendPayload: Record<string, unknown> = { repo_url };
        if (github_token) backendPayload.github_token = github_token;

        const resp = await fetch(`${BACKEND_URL}/scan-repo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(backendPayload),
            // Next.js server → Python backend: generous timeout
            signal: AbortSignal.timeout(600_000),
        });

        const data = await resp.json();
        return NextResponse.json(data, { status: resp.status });
    } catch (err: any) {
        console.error("[scan] error:", err);
        return NextResponse.json({ error: err.message || "Scan failed" }, { status: 500 });
    }
}
