import { NextResponse } from "next/server";
import { Nango } from "@nangohq/node";
import { extractNangoAccessToken } from "@/lib/nangoToken";

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || "" });

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const connectionId = url.searchParams.get("connectionId");
        const owner = url.searchParams.get("owner");
        const repo = url.searchParams.get("repo");
        const path = url.searchParams.get("path");
        const tree = url.searchParams.get("tree");
        const branch = url.searchParams.get("branch") || "main";

        if (!connectionId || !owner || !repo) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const tokenResponse = await nango.getToken("github-getting-started", connectionId);
        const token = extractNangoAccessToken(tokenResponse as any);

        if (tree === "true") {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            if (!response.ok) return NextResponse.json({ error: "Failed to fetch tree" }, { status: response.status });
            const data = await response.json();
            return NextResponse.json({ tree: data.tree });
        }

        if (path) {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3.raw",
                },
            });
            if (!response.ok) return NextResponse.json({ error: "Failed to fetch file content" }, { status: response.status });
            
            const content = await response.text();
            return NextResponse.json({ content });
        }

        return NextResponse.json({ error: "Must specify path or tree=true" }, { status: 400 });
    } catch (error: any) {
        console.error("API Error in /api/file-content:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
