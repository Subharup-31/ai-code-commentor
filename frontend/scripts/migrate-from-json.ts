// Migration script to move from telegram_users.json to PostgreSQL
// Run with: npx tsx scripts/migrate-from-json.ts

import fs from 'fs';
import path from 'path';
import { getDb, createOrUpdateUser } from '../src/lib/db';

async function migrate() {
    console.log('🔄 Starting migration from telegram_users.json to PostgreSQL...\n');

    const jsonPath = path.join(process.cwd(), 'telegram_users.json');

    if (!fs.existsSync(jsonPath)) {
        console.log('⚠️  No telegram_users.json file found. Nothing to migrate.');
        return;
    }

    try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        const mappings = JSON.parse(data);

        const entries = Object.entries(mappings);

        if (entries.length === 0) {
            console.log('⚠️  telegram_users.json is empty. Nothing to migrate.');
            return;
        }

        console.log(`Found ${entries.length} user(s) to migrate:\n`);

        for (const [telegramId, nangoConnectionId] of entries) {
            try {
                console.log(`Migrating Telegram ID: ${telegramId}`);
                console.log(`  Connection ID: ${nangoConnectionId}`);

                await createOrUpdateUser({
                    telegramId: telegramId,
                    nangoConnectionId: nangoConnectionId as string,
                });

                console.log(`  ✅ Migrated successfully\n`);
            } catch (error: any) {
                console.error(`  ❌ Failed to migrate: ${error.message}\n`);
            }
        }

        // Backup the old file
        const backupPath = path.join(process.cwd(), 'telegram_users.json.backup');
        fs.copyFileSync(jsonPath, backupPath);
        console.log(`\n📦 Backed up telegram_users.json to telegram_users.json.backup`);

        console.log('\n✅ Migration complete!');
        console.log('\nYou can now safely delete telegram_users.json');
        console.log('The old file-based storage is no longer needed.');

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    } finally {
        // Close database connection
        const db = getDb();
        await db.end();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
