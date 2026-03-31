import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const scanRepoTool = createTool({
    id: 'scanRepo',
    description: 'Scan a GitHub repository for security vulnerabilities using the backend API.',
    inputSchema: z.object({
        repo_url: z.string().describe('The URL of the GitHub repository to scan.'),
    }),
    execute: async (input: any) => {
        const { repo_url } = input;
        if (!repo_url) throw new Error("repo_url is required");

        try {
            // Using absolute URL if hosted, or localhost if running locally
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
            const res = await fetch(`${backendUrl}/scan-repo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ repo_url }),
            });

            if (!res.ok) {
                const errorData = await res.text();
                throw new Error(`Backend API error: ${res.status} ${res.statusText} - ${errorData}`);
            }

            const data = await res.json();
            return data;
        } catch (error: any) {
            console.error("Scan Repo Error:", error.message);
            throw error;
        }
    },
});
