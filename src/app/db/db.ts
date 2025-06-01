import { createPool, VercelPool, sql as vercelSqlTemplate } from '@vercel/postgres';

if (!process.env.IDEA_SUBMITTER_URL) {
    console.warn('IDEA_SUBMITTER_URL environment variable is not set. Submitter DB operations may fail.');
}

const submitterPool: VercelPool = createPool({
    connectionString: process.env.IDEA_SUBMITTER_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

if (!process.env.IDEA_REVIEWER_URL) {
    console.warn('IDEA_REVIEWER_URL environment variable is not set. Reviewer DB operations may fail.');
}
// Create a pool for the idea reviewer role
const reviewerPool: VercelPool = createPool({
    connectionString: process.env.IDEA_REVIEWER_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});


// Also export the pools if direct access is needed for transactions or client management
export { submitterPool, reviewerPool };

// Export the original Vercel SQL template for any cases it might be needed (though less likely now)
export { vercelSqlTemplate };

// Create pools for both databases
export const commentsPool = createPool({
    connectionString: process.env.COMMENTS_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const signaturePool = createPool({
    connectionString: process.env.SIGNATURE_POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const offchainProposalsPool = createPool({
    connectionString: process.env.OFFCHAIN_PROPOSALS_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// For backward compatibility, export the comments pool as the default pool
export const pool = commentsPool;
