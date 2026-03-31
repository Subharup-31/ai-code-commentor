import { Mastra } from '@mastra/core';
import { masterAgent, fallbackAgent, secondaryAgent } from './agents/masterAgent';
import { prAgent, prAgentSecondary, prAgentFallback } from './agents/prAgent';

export const mastra = new Mastra({
    agents: { masterAgent, fallbackAgent, secondaryAgent, prAgent, prAgentSecondary, prAgentFallback },
});
