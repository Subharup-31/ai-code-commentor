import fs from 'fs';
import path from 'path';

// Define the shape of our user mappings
interface TelegramMapping {
    [chatId: string]: string; // Maps Telegram Chat ID (string) to Nango Connection ID
}

const STORE_FILE_PATH = path.join(process.cwd(), 'telegram_users.json');

// Helper to reliably read the mappings file
function getMappings(): TelegramMapping {
    try {
        if (!fs.existsSync(STORE_FILE_PATH)) {
            // If the file doesn't exist, start with an empty mapping and create it
            fs.writeFileSync(STORE_FILE_PATH, JSON.stringify({}, null, 2), 'utf8');
            return {};
        }
        const data = fs.readFileSync(STORE_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading telegram_users.json:", error);
        return {};
    }
}

// Retrieve the Nango connection ID for a given Telegram chat ID
export function getTelegramConnection(chatId: number | string): string | null {
    const mappings = getMappings();
    return mappings[chatId.toString()] || null;
}

// Save or update the connection ID for a Telegram chat ID
export function setTelegramConnection(chatId: number | string, connectionId: string): void {
    const mappings = getMappings();
    mappings[chatId.toString()] = connectionId;

    try {
        fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(mappings, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing to telegram_users.json:", error);
    }
}
