import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || '' });

export const listReposTool = createTool({
    id: 'listRepos',
    description: 'List GitHub repositories for the connected user',
    inputSchema: z.object({
        connectionId: z.string().describe('The Nango connection ID for the user to authenticate with GitHub'),
    }),
    execute: async (input: any) => {
        const { connectionId } = input;
        console.log("[listRepos] Called with connectionId:", connectionId);
        if (!connectionId) throw new Error("connectionId is required");

        try {
            console.log("[listRepos] Getting Nango token for:", connectionId);
            const token = await nango.getToken('github-getting-started', connectionId);
            const res = await fetch('https://api.github.com/user/repos?per_page=10&sort=updated', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });
            if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
            const data = await res.json();
            return data.map((repo: any) => ({
                name: repo.name,
                full_name: repo.full_name,
                html_url: repo.html_url,
                private: repo.private,
            }));
        } catch (error: any) {
            console.error("List Repos Error:", error.message);
            throw error;
        }
    },
});

export const createPrTool = createTool({
    id: 'createPr',
    description: 'Create a Pull Request on a GitHub repository with specified changes/fixes',
    inputSchema: z.object({
        connectionId: z.string().describe('The Nango connection ID for the user to authenticate with GitHub'),
        owner: z.string().describe('The owner of the repository'),
        repo: z.string().describe('The repository name'),
        title: z.string().describe('The title of the Pull Request'),
        body: z.string().describe('The body/description of the Pull Request'),
        branch: z.string().describe('The name of the new branch to create'),
        base: z.string().describe('The base branch to merge into (usually main or master)'),
    }),
    execute: async (input: any) => {
        const { connectionId, owner, repo, title, body, branch, base } = input;
        if (!connectionId) throw new Error("connectionId is required");

        try {
            const token = await nango.getToken('github-getting-started', connectionId);

            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, body, head: branch, base }),
            });

            if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
            const data = await res.json();
            return { pr_url: data.html_url, number: data.number };
        } catch (error: any) {
            console.error("Create PR Error:", error.message);
            throw error;
        }
    },
});

export const getFileContentTool = createTool({
    id: 'getFileContent',
    description: 'Get the content of a file from a GitHub repository',
    inputSchema: z.object({
        connectionId: z.string().describe('The Nango connection ID for the user to authenticate with GitHub'),
        owner: z.string().describe('The owner of the repository'),
        repo: z.string().describe('The repository name'),
        path: z.string().describe('The path to the file in the repository (e.g., src/index.ts)'),
    }),
    execute: async (input: any) => {
        const { connectionId, owner, repo, path } = input;
        if (!connectionId) throw new Error("connectionId is required");

        try {
            const token = await nango.getToken('github-getting-started', connectionId);

            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });

            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error(`File not found: ${path}`);
                }
                throw new Error(`GitHub API error: ${res.statusText}`);
            }

            const data = await res.json();
            if (data.type !== 'file') {
                throw new Error(`Path is not a file: ${path}`);
            }

            // GitHub returns base64 encoded content
            const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
            return { content: decodedContent, sha: data.sha };
        } catch (error: any) {
            console.error("Get File Content Error:", error.message);
            throw error;
        }
    },
});

export const commitAndCreatePrTool = createTool({
    id: 'commitAndCreatePr',
    description: 'Create a new branch, commit file changes, and create a Pull Request',
    inputSchema: z.object({
        connectionId: z.string().describe('The Nango connection ID for the user to authenticate with GitHub'),
        owner: z.string().describe('The owner of the repository'),
        repo: z.string().describe('The repository name'),
        baseBranch: z.string().describe('The base branch to branch off from and merge into (usually main or master)'),
        newBranch: z.string().describe('The name of the new branch to create for the fix'),
        path: z.string().describe('The path to the file to update'),
        targetSnippet: z.string().describe('The exact original code snippet to be replaced'),
        replacementSnippet: z.string().describe('The new code snippet to replace the target snippet'),
        commitMessage: z.string().describe('The commit message'),
        prTitle: z.string().describe('The title of the Pull Request'),
        prBody: z.string().describe('The body description of the Pull Request'),
    }),
    execute: async (input: any) => {
        return await commitAndCreatePrManual(input);
    }
});

export async function commitAndCreatePrManual(input: any) {
    const { connectionId, owner, repo, baseBranch, newBranch, path, targetSnippet, replacementSnippet, commitMessage, prTitle, prBody } = input;
    if (!connectionId) throw new Error("connectionId is required");

        try {
            const token = await nango.getToken('github-getting-started', connectionId);
            const headers = {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            };

            // 1. Get SHA of base branch
            const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`, { headers });
            if (!refRes.ok) throw new Error(`Failed to get base branch SHA: ${refRes.statusText}`);
            const refData = await refRes.json();
            const baseSha = refData.object.sha;

            // 2. Create new branch
            const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
            });
            if (!branchRes.ok && branchRes.status !== 422) { // 422 might mean it already exists, but ideally it should be unique
                throw new Error(`Failed to create branch: ${branchRes.statusText}`);
            }

            // 3. Get current SHA of the file (required to update it)
            const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${baseBranch}`, { headers });
            if (!fileRes.ok) throw new Error(`Failed to get current file SHA: ${fileRes.statusText}`);
            const fileData = await fileRes.json();
            const fileSha = fileData.sha;

            const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
            if (!currentContent.includes(targetSnippet)) {
                throw new Error("Target snippet not found in the original file. Please make sure targetSnippet exactly matches the original text. Also ensure you preserve exact whitespace.");
            }
            const newContent = currentContent.replace(targetSnippet, replacementSnippet);

            // 4. Update the file in the new branch
            const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    message: commitMessage,
                    content: Buffer.from(newContent, 'utf-8').toString('base64'),
                    sha: fileSha,
                    branch: newBranch
                }),
            });
            if (!updateRes.ok) throw new Error(`Failed to commit file: ${updateRes.statusText}`);

            // 5. Create Pull Request
            const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ title: prTitle, body: prBody, head: newBranch, base: baseBranch }),
            });

            if (!prRes.ok) throw new Error(`Failed to create PR: ${await prRes.text()}`);
            const prData = await prRes.json();
            return { pr_url: prData.html_url, number: prData.number, branch: newBranch };
        } catch (error: any) {
            console.error("Commit & PR Error:", error.message);
            throw error;
        }
}
