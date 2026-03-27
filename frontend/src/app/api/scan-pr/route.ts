import { NextResponse } from "next/server";
import { Nango } from "@nangohq/node";
import { extractNangoAccessToken } from "@/lib/nangoToken";

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || "" });
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pr_url, connection_id } = body;

        if (!pr_url) {
            return NextResponse.json({ error: "Missing pr_url" }, { status: 400 });
        }

        let github_token: string | null = null;
        if (connection_id) {
            try {
                const token = await nango.getToken("github-getting-started", connection_id);
                github_token = extractNangoAccessToken(token as any);
            } catch (err: any) {
                console.warn("[scan-pr] Could not fetch Nango token:", err.message);
            }
        }

        const backendPayload: Record<string, unknown> = { pr_url };
        if (github_token) backendPayload.github_token = github_token;

        const resp = await fetch(`${BACKEND_URL}/scan-pr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(backendPayload),
            signal: AbortSignal.timeout(600_000),
        });

        const data = await resp.json();
        return NextResponse.json(data, { status: resp.status });
    } catch (err: any) {
        console.error("[scan-pr] error:", err);
        return NextResponse.json({ error: err.message || "Scan failed" }, { status: 500 });
    }
}
