import { NextRequest } from 'next/server';
import { reviewerPool } from '@/app/db/db'; // Path to your database pool for the 'signatures' table

// Define how long a "session" (based on the last signature verification) is valid.
const AUTH_SESSION_DURATION_HOURS = 24; // Consider making this an environment variable

/**
 * Verifies if the requesting address has a recent valid signature record in the database.
 * Expects the client to send the address in the 'X-User-Address' header.
 * 
 * @param request - The NextRequest object.
 * @returns The verified wallet address (lowercase) if a recent valid signature exists, otherwise null.
 */
export async function getVerifiedRequesterAddress(request: NextRequest): Promise<string | null> {
    console.log('[AuthUtils] Verifying requester address...');
    const claimedAddressHeader = request.headers.get('X-User-Address');
    console.log(`[AuthUtils] X-User-Address header: ${claimedAddressHeader}`);

    if (!claimedAddressHeader) {
        console.log('[AuthUtils] Auth: X-User-Address header missing.');
        return null;
    }

    // Basic address format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(claimedAddressHeader)) {
        console.warn(`[AuthUtils] Auth: Invalid address format in X-User-Address header: ${claimedAddressHeader}`);
        return null;
    }

    const claimedAddress = claimedAddressHeader.toLowerCase();
    console.log(`[AuthUtils] Claimed address (lowercase): ${claimedAddress}`);

    try {
        const sessionExpiryTime = new Date(Date.now() - AUTH_SESSION_DURATION_HOURS * 60 * 60 * 1000);
        console.log(`[AuthUtils] Session expiry time: ${sessionExpiryTime.toISOString()}`);

        // This query assumes your 'signatures' table has a 'created_at' column (DATETIME/TIMESTAMP)
        // that records when the row was inserted.
        console.log(`[AuthUtils] Querying for address: ${claimedAddress}, after date: ${sessionExpiryTime.toISOString()}`);
        const result = await reviewerPool.sql`
            SELECT address, created_at, is_valid
            FROM signatures
            WHERE LOWER(address) = ${claimedAddress}
              AND is_valid = TRUE
              AND created_at >= ${sessionExpiryTime.toISOString()}
            ORDER BY created_at DESC
            LIMIT 1;
        `;

        console.log('[AuthUtils] Database query result:', JSON.stringify(result, null, 2));

        if (result && result.rows && typeof result.rowCount === 'number' && result.rowCount > 0 && result.rows[0]?.address) {
            console.log(`[AuthUtils] Auth: Address ${result.rows[0].address} successfully verified via recent signature. Details: ${JSON.stringify(result.rows[0])}`);
            return result.rows[0].address; // Return address from DB for consistent casing
        } else {
            console.log(`[AuthUtils] Auth: No recent valid signature found in DB for address ${claimedAddress}. Searched for is_valid=TRUE and created_at >= ${sessionExpiryTime.toISOString()}. Row count: ${result?.rowCount}`);
            return null;
        }
    } catch (error) {
        console.error('[AuthUtils] Auth: Error in getVerifiedRequesterAddress while querying database:', error);
        return null; // Ensure null is returned on error to deny access
    }
} 