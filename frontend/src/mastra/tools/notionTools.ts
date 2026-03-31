import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || '' });

export const updateNotionTool = createTool({
    id: 'updateNotion',
    description: 'Create or update a page in Notion with a vulnerability scan report. Note: User must connect Notion separately from GitHub in the Integrations page.',
    inputSchema: z.object({
        connectionId: z.string().describe('The Nango connection ID for the user to authenticate with Notion'),
        pageId: z.string().optional().describe('The Notion Page ID to update. If omitted, creates a new page in the first available workspace page.'),
        title: z.string().describe('Title of the scan report'),
        content: z.string().describe('Markdown content of the scan report'),
    }),
    execute: async (input: any) => {
        const { connectionId, pageId, title, content } = input;

        try {
            // Get token: prefer Notion-specific Nango connection, fall back to env var
            let token: string;
            if (process.env.NOTION_ACCESS_TOKEN) {
                console.log('[Notion Tool] Using NOTION_ACCESS_TOKEN from environment');
                token = process.env.NOTION_ACCESS_TOKEN;
            } else if (connectionId) {
                console.log('[Notion Tool] Attempting to get Notion token from Nango for connectionId:', connectionId);
                try {
                    token = await nango.getToken('notion', connectionId) as string;
                    console.log('[Notion Tool] Successfully retrieved Notion token');
                } catch (nangoError: any) {
                    console.error('[Notion Tool] Nango token retrieval failed:', nangoError.message);
                    throw new Error(`Notion is not connected. Please go to the Integrations page and click "Connect Notion" first. (Nango error: ${nangoError.message})`);
                }
            } else {
                throw new Error("connectionId or NOTION_ACCESS_TOKEN is required to connect to Notion");
            }

            const notionHeaders = {
                Authorization: `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            };

            // Convert markdown content into Notion blocks (paragraphs)
            const contentBlocks = content.split('\n').filter((line: string) => line.trim()).map((line: string) => ({
                object: 'block' as const,
                type: 'paragraph' as const,
                paragraph: {
                    rich_text: [{
                        type: 'text' as const,
                        text: { content: line },
                    }],
                },
            }));

            if (pageId) {
                // Append blocks to existing page
                const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
                    method: 'PATCH',
                    headers: notionHeaders,
                    body: JSON.stringify({ children: contentBlocks }),
                });

                if (!res.ok) {
                    const errData = await res.text();
                    throw new Error(`Notion API error (append): ${res.status} ${res.statusText} — ${errData}`);
                }

                return { success: true, message: `Updated Notion page ${pageId} with report "${title}".` };
            } else {
                // Search for a parent page to create under
                const searchRes = await fetch('https://api.notion.com/v1/search', {
                    method: 'POST',
                    headers: notionHeaders,
                    body: JSON.stringify({
                        filter: { value: 'page', property: 'object' },
                        page_size: 1,
                    }),
                });

                if (!searchRes.ok) {
                    const errData = await searchRes.text();
                    console.error('[Notion Tool] Search failed:', searchRes.status, errData);
                    
                    if (searchRes.status === 401) {
                        throw new Error("Notion authentication failed. Please reconnect Notion in the Integrations page.");
                    } else if (searchRes.status === 404) {
                        throw new Error("Notion integration not found. Please ensure you've connected Notion in the Integrations page and granted the necessary permissions.");
                    }
                    
                    throw new Error(`Notion API error (search): ${searchRes.status} ${searchRes.statusText} — ${errData}`);
                }

                const searchData = await searchRes.json();
                const parentPage = searchData.results?.[0];

                if (!parentPage) {
                    throw new Error("No pages found in Notion workspace. Please create at least one page in Notion and share it with the VulnGuard integration.");
                }

                // Create new page under the found parent
                const createRes = await fetch('https://api.notion.com/v1/pages', {
                    method: 'POST',
                    headers: notionHeaders,
                    body: JSON.stringify({
                        parent: { page_id: parentPage.id },
                        properties: {
                            title: {
                                title: [{ text: { content: title } }],
                            },
                        },
                        children: contentBlocks.slice(0, 100), // Notion limit: max 100 blocks per request
                    }),
                });

                if (!createRes.ok) {
                    const errData = await createRes.text();
                    throw new Error(`Notion API error (create): ${createRes.status} ${createRes.statusText} — ${errData}`);
                }

                const createData = await createRes.json();
                return {
                    success: true,
                    message: `Created new Notion page "${title}" successfully.`,
                    page_url: createData.url,
                    page_id: createData.id,
                };
            }
        } catch (error: any) {
            console.error("Notion Error:", error.message);
            throw error;
        }
    },
});
