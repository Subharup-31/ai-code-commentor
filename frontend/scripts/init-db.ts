// Database initialization script
// Run with: npx tsx scripts/init-db.ts

import { initializeDatabase } from '../src/lib/db';

async function main() {
    console.log('🚀 Initializing database...\n');

    try {
        await initializeDatabase();
        console.log('\n✅ Database initialization complete!');
        console.log('\nTables created:');
        console.log('  - telegram_users');
        console.log('  - scan_jobs');
        console.log('  - oauth_states');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database initialization failed:', error);
        process.exit(1);
    }
}

main();
