import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';

// Configure PostgreSQL connection
const pool = createPool({
  connectionString: process.env.VOUCHERS_DATABASE_URL
});

const VOUCHER_EXPIRATION_HOURS = 24; // Vouchers expire after 24 hours if not verified
const MAX_HOLONYM_CHECK_ATTEMPTS = 10; // Max attempts to find and assign a non-redeemed voucher

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();
    
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address provided' },
        { status: 400 }
      );
    }

    const normalizedAddress = userAddress.toLowerCase();

    try {
      await pool.sql`SELECT cleanup_expired_vouchers()`;

      const existingVoucherResult = await pool.sql`
        SELECT 
          voucher_id, 
          status, 
          expires_at,
          verified_at,
          is_redeemed,
          assigned_at
        FROM vouchers 
        WHERE redeemed_by = ${normalizedAddress}
      `;

      if (existingVoucherResult.rows.length > 0) {
        const existingVoucher = existingVoucherResult.rows[0];
        
        // If voucher is 'assigned' and expired, it should have been caught by cleanup_expired_vouchers.
        // If it's somehow still here, tell them to wait.
        if (existingVoucher.status === 'assigned' && new Date(existingVoucher.expires_at) < new Date()) {
          // This case should ideally be rare if cleanup_expired_vouchers works correctly.
          // We might also want to trigger a delete here or let cleanup handle it next cycle.
          return NextResponse.json(
            { error: 'You had an expired voucher. It should be cleared soon. Please try again shortly.' },
            { status: 400 } // Or 409 Conflict
          );
        }
        
        // If voucher exists (assigned or verified) and is not expired, return it.
        // No need to call Holonym API if we already have it assigned and it's not marked as an issue.
        const verificationUrl = `https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs?voucherId=${existingVoucher.voucher_id}`;
        
        return NextResponse.json({ 
          voucher: existingVoucher.voucher_id,
          verificationUrl, 
          status: existingVoucher.status,
          isVerified: existingVoucher.is_redeemed,
          verifiedAt: existingVoucher.verified_at,
          expiresAt: existingVoucher.expires_at,
          assignedAt: existingVoucher.assigned_at // Added for consistency
        });
      }

      // No existing valid voucher for this user, try to get and assign a new one
      let voucherAssigned = false;
      let attempts = 0;

      while (!voucherAssigned && attempts < MAX_HOLONYM_CHECK_ATTEMPTS) {
        attempts++;

        // 1. Fetch an available voucher (not using SKIP LOCKED here, Holonym check acts as a filter)
        const availableVoucherResult = await pool.sql`
            SELECT voucher_id, expires_at 
            FROM vouchers 
            WHERE status = 'available' 
            AND is_redeemed = false 
            AND expires_at > CURRENT_TIMESTAMP -- Ensure voucher itself isn't pre-expired
            ORDER BY created_at ASC
            LIMIT 1;
        `;

        if (availableVoucherResult.rowCount === 0) {
          // No more available vouchers in the DB
          return NextResponse.json(
            { error: 'No available vouchers at the moment. Please try again later.' },
            { status: 404 }
          );
        }

        const potentialVoucher = availableVoucherResult.rows[0];
        const voucherId = potentialVoucher.voucher_id;
        const verificationUrl = `https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs?voucherId=${voucherId}`;


        // 2. Call Holonym API to check if voucher is redeemed
        try {
          const holonymApiUrl = 'https://phone.holonym.io/sessions/is-voucher-redeemed';
          const holonymResponse = await fetch(holonymApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voucherId: voucherId }),
          });

          if (!holonymResponse.ok) {
            console.error(`Holonym API error for voucher ${voucherId}: ${holonymResponse.status} ${await holonymResponse.text()}`);
            // If Holonym API call fails, we can't confirm status. It's safer to not assign this voucher
            // and let the loop try another, or fail if max attempts reached.
            // For a production system, consider more nuanced error handling or circuit breaker.
            if (attempts >= MAX_HOLONYM_CHECK_ATTEMPTS) {
                 return NextResponse.json(
                    { error: 'Failed to verify voucher status with Holonym after several attempts. Please try again.' },
                    { status: 503 } // Service Unavailable
                );
            }
            continue; // Try next available voucher
          }

          const holonymData = await holonymResponse.json();
          
          // Assuming Holonym returns { "isRedeemed": boolean }
          // IMPORTANT: Confirm this exact field name and boolean value logic.
          if (holonymData.isRedeemed === true) {
            // Voucher is already redeemed according to Holonym. Delete it from our DB.
            await pool.sql`DELETE FROM vouchers WHERE voucher_id = ${voucherId};`;
            console.log(`Voucher ${voucherId} was already redeemed (per Holonym) and has been deleted.`);
            // Loop again to find another voucher.
          } else {
            // Voucher is NOT redeemed according to Holonym. Try to assign it.
            // Using a transaction to ensure atomicity of check-then-assign for THIS voucher.
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              // Re-check voucher status to prevent race conditions before updating
              const recheckVoucher = await client.query(
                "SELECT status, is_redeemed FROM vouchers WHERE voucher_id = $1 AND status = 'available' AND is_redeemed = false",
                [voucherId]
              );

              if (recheckVoucher.rowCount === 0) {
                // Voucher was snatched or status changed. Abort and try another.
                await client.query('ROLLBACK');
                console.log(`Voucher ${voucherId} was modified or sniped before assignment. Retrying.`);
                // Continue to the next iteration of the while loop
              } else {
                const newExpiresAt = new Date(Date.now() + VOUCHER_EXPIRATION_HOURS * 60 * 60 * 1000);
                const assignResult = await client.query(`
                    UPDATE vouchers 
                    SET 
                        status = 'assigned', 
                        redeemed_by = $1, 
                        assigned_at = CURRENT_TIMESTAMP,
                        expires_at = $2,
                        is_redeemed = false,
                        redeemed_at = NULL,
                        verified_at = NULL
                    WHERE voucher_id = $3
                      AND status = 'available' -- Double check
                      AND is_redeemed = false
                    RETURNING voucher_id, expires_at, status, is_redeemed, verified_at, assigned_at;
                `, [normalizedAddress, newExpiresAt.toISOString(), voucherId]);

                if (assignResult && assignResult.rowCount && assignResult.rowCount > 0 && assignResult.rows && assignResult.rows.length > 0) {
                  await client.query('COMMIT');
                  const assignedVoucher = assignResult.rows[0];
                  voucherAssigned = true; // Exit loop

                  // Get updated analytics (outside transaction for simplicity)
                  const analytics = await pool.sql`SELECT * FROM get_voucher_analytics();`;

                  return NextResponse.json({
                      voucher: assignedVoucher.voucher_id,
                      verificationUrl, // Constructed earlier
                      status: assignedVoucher.status,
                      isVerified: assignedVoucher.is_redeemed,
                      verifiedAt: assignedVoucher.verified_at,
                      expiresAt: assignedVoucher.expires_at,
                      assignedAt: assignedVoucher.assigned_at,
                      analytics: analytics.rows[0] // Assuming get_voucher_analytics returns one row
                  });
                } else {
                  // Should not happen if re-check passed and DB is consistent, but as a safeguard:
                  await client.query('ROLLBACK');
                  console.log(`Failed to assign voucher ${voucherId} despite re-check. Retrying.`);
                }
              }
            } catch (txnError) {
              await client.query('ROLLBACK');
              throw txnError; // Rethrow to be caught by outer try-catch
            } finally {
              client.release();
            }
          }
        } catch (apiOrDbError) {
          // This catches errors from Holonym fetch, JSON parsing, or the transaction block
          console.error(`Error processing voucher ${voucherId}:`, apiOrDbError);
          // If an error occurs with a specific voucher (e.g., network to Holonym, unexpected Holonym response),
          // it's generally safer to not delete our voucher and try another or fail.
          // The loop will continue if attempts < MAX_HOLONYM_CHECK_ATTEMPTS
          if (attempts >= MAX_HOLONYM_CHECK_ATTEMPTS) {
            return NextResponse.json(
                { error: 'An error occurred while processing vouchers. Please try again later.' },
                { status: 500 }
            );
          }
        }
      } // End of while loop

      // If loop finishes without assigning a voucher
      if (!voucherAssigned) {
         // This could be due to all available vouchers being redeemed (per Holonym and deleted),
         // or due to persistent Holonym API errors / race conditions after MAX_ATTEMPTS.
        return NextResponse.json(
          { error: 'Could not find an assignable voucher after several attempts. Please try again later.' },
          { status: 409 } // Conflict or a more general server error
        );
      }

    } catch (queryError) {
      console.error('Database operation error:', queryError);
      // Check for specific Vercel Postgres error codes if needed
      return NextResponse.json(
        { error: 'Database operation failed.', details: queryError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    // Catch errors from request.json() or other synchronous parts at the top
    console.error('API handler error:', error);
    return NextResponse.json(
      { error: 'Failed to process request.', details: error.message },
      { status: 500 }
    );
  }
} 