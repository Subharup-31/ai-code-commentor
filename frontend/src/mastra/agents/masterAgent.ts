import { Agent } from '@mastra/core/agent';
import { primaryModel, secondaryModel, fallbackModel } from '../llm';
import { listReposTool, createPrTool } from '../tools/githubTools';
import { updateNotionTool } from '../tools/notionTools';
import { scanRepoTool } from '../tools/scannerTools';

const instructions = `You are the core AI agent of the VulnGuard API. 
Your role is to help users scan their repositories for vulnerabilities and manage their GitHub and Notion workflows.
You have access to tools that allow you to:
1. List the user's GitHub repositories.
2. Scan a specific repository for vulnerabilities using the scanRepoTool.
3. Create Pull Requests containing vulnerability fixes.
4. Update or export scan reports into Notion.

IMPORTANT: GitHub and Notion use SEPARATE connections. If a user wants to use Notion features, they must connect Notion separately in the Integrations page, even if they've already connected GitHub.

Always ask for a connectionId in the tool payload (the UI or webhook will automatically provide this, but you should pass it along to the tool from your context or arguments if the tool requires it). Make sure you clearly communicate what you have done. 
When returning lists of vulnerabilities, format them cleanly using Markdown.
If the user asks you to scan a repo, use the scanRepoTool.
If the user asks you to list their vulnerabilities, make sure they have scanned a repo first, or ask them which repo to scan.
If a Notion tool fails with a connection error, politely inform the user they need to connect Notion in the Integrations page.`;

const tools = {
    listReposTool,
    createPrTool,
    updateNotionTool,
    scanRepoTool,
};

export const masterAgent = new Agent({
    id: 'masterAgent',
    name: 'Master Orchestrator',
    instructions,
    model: primaryModel,
    tools,
});

export const secondaryAgent = new Agent({
    id: 'secondaryAgent',
    name: 'Master Orchestrator (Secondary)',
    instructions,
    model: secondaryModel,
    tools,
});

export const fallbackAgent = new Agent({
    id: 'fallbackAgent',
    name: 'Master Orchestrator (Fallback)',
    instructions,
    model: fallbackModel,
    tools,
});
