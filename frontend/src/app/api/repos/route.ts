import { NextResponse } from "next/server";
import { Nango } from "@nangohq/node";
import { extractNangoAccessToken } from "@/lib/nangoToken";

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || "" });

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const connectionId = url.searchParams.get("connectionId");

        if (!connectionId) {
            return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
        }

        try {
            // Retrieve the GitHub token from Nango using the multi-user connection ID
            const tokenResponse = await nango.getToken("github-getting-started", connectionId);
            const token = extractNangoAccessToken(tokenResponse as any);

            let allRepos: any[] = [];
            let numPage = 1;
            let hasMore = true;

            while (hasMore) {
                // Fetch repositories from GitHub
                const response = await fetch(`https://api.github.com/user/repos?per_page=100&page=${numPage}&sort=updated`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                });

                if (!response.ok) {
                    return NextResponse.json({ error: `GitHub API error: ${response.statusText}` }, { status: response.status });
                }

                const data = await response.json();

                if (data.length === 0) {
                    hasMore = false;
                } else {
                    allRepos = allRepos.concat(data);
                    numPage++;
                }
            }

            // Format to what the UI expects
            const repos = allRepos.map((repo: any) => ({
                name: repo.name,
                full_name: repo.full_name,
                clone_url: repo.clone_url,
                private: repo.private,
                default_branch: repo.default_branch,
            }));

            return NextResponse.json(repos);
        } catch (error: any) {
            console.error("Failed to fetch repos from GitHub via Nango:", error.message, error);
            return NextResponse.json({ error: `Failed to fetch repositories: ${error.message}` }, { status: 500 });
        }
    } catch (error: any) {
        console.error("GET repos error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
