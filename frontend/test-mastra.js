import { mastra } from './src/mastra/index.js';
import crypto from 'crypto';

async function run() {
    try {
        const agent = mastra.getAgent('masterAgent');
        const systemPrompt = {
            id: crypto.randomUUID(),
            role: 'system',
            content: "You are a helpful assistant.",
            createdAt: new Date()
        };
        const messages = [
            systemPrompt,
            {
                id: crypto.randomUUID(),
                role: 'user',
                content: "hello",
                createdAt: new Date()
            }
        ];
        console.log("Calling agent.stream...");
        const result = await agent.stream(messages);
        console.log("Got result. Reading textStream...");

        const reader = result.textStream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("Stream done.");
                break;
            }
            process.stdout.write(value);
        }
    } catch (e) {
        console.error("Test Error:", e);
    }
}
run();
