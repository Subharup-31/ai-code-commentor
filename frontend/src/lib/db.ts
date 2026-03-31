// Database client for PostgreSQL
// For production, use Prisma or pg-pool for connection pooling

import type { Pool as PgPool } from 'pg';

// Dynamic import to avoid build-time errors
let Pool: any;
try {
    Pool = require('pg').Pool;
} catch (e) {
    console.warn('pg module not installed. Run: npm install pg');
}

// Singleton pattern for database connection
let pool: PgPool | null = null;

export function getDb(): PgPool {
    if (!pool && Pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool?.on('error', (err: Error) => {
            console.error('Unexpected database error:', err);
        });
    }

    if (!pool) {
        throw new Error('Database connection not initialized. Make sure pg module is installed and DATABASE_URL is set.');
    }

    return pool;
}

// User operations
export interface TelegramUser {
    id: number;
    telegram_id: string;
    telegram_username?: string;
    nango_connection_id: string;
    github_username?: string;
    github_user_id?: number;
    connected_at: Date;
    last_active_at: Date;
    is_active: boolean;
}

export async function getUserByTelegramId(telegramId: string | number): Promise<TelegramUser | null> {
    const db = getDb();
    const result = await db.query(
        'SELECT * FROM telegram_users WHERE telegram_id = $1 AND is_active = true',
        [telegramId.toString()]
    );
    return result.rows[0] || null;
}

export async function getUserByNangoConnectionId(connectionId: string): Promise<TelegramUser | null> {
    const db = getDb();
    const result = await db.query(
        'SELECT * FROM telegram_users WHERE nango_connection_id = $1 AND is_active = true',
        [connectionId]
    );
    return result.rows[0] || null;
}

export async function createOrUpdateUser(data: {
    telegramId: string | number;
    telegramUsername?: string;
    nangoConnectionId: string;
    githubUsername?: string;
    githubUserId?: number;
}): Promise<TelegramUser> {
    const db = getDb();
    const result = await db.query(
        `INSERT INTO telegram_users 
            (telegram_id, telegram_username, nango_connection_id, github_username, github_user_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (telegram_id) 
         DO UPDATE SET 
            telegram_username = EXCLUDED.telegram_username,
            nango_connection_id = EXCLUDED.nango_connection_id,
            github_username = EXCLUDED.github_username,
            github_user_id = EXCLUDED.github_user_id,
            last_active_at = NOW(),
            is_active = true
         RETURNING *`,
        [
            data.telegramId.toString(),
            data.telegramUsername,
            data.nangoConnectionId,
            data.githubUsername,
            data.githubUserId
        ]
    );
    return result.rows[0];
}

export async function updateUserActivity(telegramId: string | number): Promise<void> {
    const db = getDb();
    await db.query(
        'UPDATE telegram_users SET last_active_at = NOW() WHERE telegram_id = $1',
        [telegramId.toString()]
    );
}

// OAuth state operations
export interface OAuthState {
    id: number;
    state_token: string;
    telegram_id: string;
    created_at: Date;
    expires_at: Date;
}

export async function createOAuthState(telegramId: string | number): Promise<string> {
    const db = getDb();
    const stateToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.query(
        'INSERT INTO oauth_states (state_token, telegram_id, expires_at) VALUES ($1, $2, $3)',
        [stateToken, telegramId.toString(), expiresAt]
    );

    return stateToken;
}

export async function getOAuthState(stateToken: string): Promise<OAuthState | null> {
    const db = getDb();
    const result = await db.query(
        'SELECT * FROM oauth_states WHERE state_token = $1 AND expires_at > NOW()',
        [stateToken]
    );
    return result.rows[0] || null;
}

export async function deleteOAuthState(stateToken: string): Promise<void> {
    const db = getDb();
    await db.query('DELETE FROM oauth_states WHERE state_token = $1', [stateToken]);
}

// Clean up expired OAuth states (run periodically)
export async function cleanupExpiredOAuthStates(): Promise<void> {
    const db = getDb();
    await db.query('DELETE FROM oauth_states WHERE expires_at < NOW()');
}

// Scan job operations
export interface ScanJob {
    id: number;
    user_id: number;
    repo_url: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    started_at?: Date;
    completed_at?: Date;
    result_summary?: any;
    error_message?: string;
    created_at: Date;
}

export async function createScanJob(userId: number, repoUrl: string): Promise<ScanJob> {
    const db = getDb();
    const result = await db.query(
        'INSERT INTO scan_jobs (user_id, repo_url, status) VALUES ($1, $2, $3) RETURNING *',
        [userId, repoUrl, 'pending']
    );
    return result.rows[0];
}

export async function updateScanJobStatus(
    jobId: number,
    status: ScanJob['status'],
    data?: { result_summary?: any; error_message?: string }
): Promise<void> {
    const db = getDb();

    if (status === 'running') {
        await db.query(
            'UPDATE scan_jobs SET status = $1, started_at = NOW() WHERE id = $2',
            [status, jobId]
        );
    } else if (status === 'completed' || status === 'failed') {
        await db.query(
            `UPDATE scan_jobs 
             SET status = $1, completed_at = NOW(), result_summary = $2, error_message = $3 
             WHERE id = $4`,
            [status, data?.result_summary || null, data?.error_message || null, jobId]
        );
    }
}

export async function getUserScanJobs(userId: number, limit: number = 10): Promise<ScanJob[]> {
    const db = getDb();
    const result = await db.query(
        'SELECT * FROM scan_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
    );
    return result.rows;
}

// Utility functions
function generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

// Database initialization (run once)
export async function initializeDatabase() {
    const db = getDb();

    await db.query(`
        CREATE TABLE IF NOT EXISTS telegram_users (
            id SERIAL PRIMARY KEY,
            telegram_id VARCHAR(255) UNIQUE NOT NULL,
            telegram_username VARCHAR(255),
            nango_connection_id VARCHAR(255) UNIQUE NOT NULL,
            github_username VARCHAR(255),
            github_user_id INTEGER,
            connected_at TIMESTAMP DEFAULT NOW(),
            last_active_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE
        );
    `);

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_telegram_id ON telegram_users(telegram_id);
        CREATE INDEX IF NOT EXISTS idx_nango_connection_id ON telegram_users(nango_connection_id);
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS scan_jobs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES telegram_users(id),
            repo_url VARCHAR(500) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            result_summary JSONB,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_user_scans ON scan_jobs(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_scan_status ON scan_jobs(status);
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS oauth_states (
            id SERIAL PRIMARY KEY,
            state_token VARCHAR(255) UNIQUE NOT NULL,
            telegram_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL
        );
    `);

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_state_token ON oauth_states(state_token);
    `);

    console.log('✅ Database initialized successfully');
}
