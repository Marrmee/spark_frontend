import { NextRequest, NextResponse } from 'next/server';
import { submitterPool } from '@/app/db/db';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';

const DOCUSIGN_CONNECT_SECRET = process.env.DOCUSIGN_CONNECT_SECRET;

// Define a simplified structure for the DocuSign XML payload we care about
// This can be expanded based on the actual XML structure DocuSign sends
interface DocuSignEnvelopeInformation {
  EnvelopeStatus?: {
    EnvelopeID?: [string];
    Status?: [string]; // e.g., 'Completed', 'Sent', 'Delivered', 'Signed', 'Declined', 'Voided'
    // You might need to inspect RecipientStatuses for more granular detail
    RecipientStatuses?: {
        RecipientStatus?: {
            Email?: [string];
            UserName?: [string];
            Status?: [string]; // e.g., 'Completed', 'Declined'
            Signed?: [string]; // Date string
        }[];
    }[];
  };
}

// Database error interface
interface DatabaseError {
  message: string;
  code?: string;
}

export async function POST(request: NextRequest) {
  console.log('[DocuSign Webhook] Received POST request');
  let rawBodyText: string;

  try {
    rawBodyText = await request.text();
  } catch (error) {
    console.error('[DocuSign Webhook] Error reading request body:', error);
    return NextResponse.json({ error: 'Could not read request body' }, { status: 400 });
  }

  // 1. HMAC Signature Verification (Optional but Recommended)
  if (DOCUSIGN_CONNECT_SECRET) {
    const signatureHeader = request.headers.get('x-docusign-signature-1'); // DocuSign usually sends multiple, pick one
    if (!signatureHeader) {
      console.warn('[DocuSign Webhook] HMAC verification enabled, but no signature header found.');
      return NextResponse.json({ error: 'Missing DocuSign signature' }, { status: 401 });
    }

    try {
      const generatedHash = crypto
        .createHmac('sha256', DOCUSIGN_CONNECT_SECRET)
        .update(rawBodyText, 'utf8') // Ensure encoding matches what DocuSign uses for hashing
        .digest('base64');

      if (generatedHash !== signatureHeader) {
        console.warn('[DocuSign Webhook] HMAC signature mismatch.', { generatedHash, signatureHeader });
        return NextResponse.json({ error: 'Invalid DocuSign signature' }, { status: 401 });
      }
      console.log('[DocuSign Webhook] HMAC signature verified successfully.');
    } catch (hmacError) {
      console.error('[DocuSign Webhook] Error during HMAC verification:', hmacError);
      return NextResponse.json({ error: 'Error verifying signature' }, { status: 500 });
    }
  } else {
    console.warn('[DocuSign Webhook] DOCUSIGN_CONNECT_SECRET not set. Skipping HMAC verification. This is NOT recommended for production.');
  }

  // 2. Parse XML Payload
  let parsedData: DocuSignEnvelopeInformation;
  try {
    // Explicitly tell parser not to use `>` in key names, use default behavior
    parsedData = await parseStringPromise(rawBodyText, {
        explicitArray: true, // Ensures elements are always arrays
        explicitRoot: false, // We don't need the root DocuSignEnvelopeInformation element explicitly in the object
        tagNameProcessors: [], // No tag name processing
        attrNameProcessors: [], // No attribute name processing
        valueProcessors: [], // No value processing
        attrValueProcessors: [] // No attribute value processing
    }) as DocuSignEnvelopeInformation;

    if (!parsedData || !parsedData.EnvelopeStatus) {
        console.error('[DocuSign Webhook] Invalid XML structure: EnvelopeStatus missing.', parsedData);
        return NextResponse.json({ error: 'Invalid XML payload structure from DocuSign.' }, { status: 400 });
    }

  } catch (xmlError) {
    console.error('[DocuSign Webhook] Error parsing XML:', xmlError);
    return NextResponse.json({ error: 'Failed to parse XML payload' }, { status: 400 });
  }

  const envelopeId = parsedData.EnvelopeStatus?.EnvelopeID?.[0];
  const envelopeStatus = parsedData.EnvelopeStatus?.Status?.[0]; // e.g., 'Completed', 'Sent', 'Delivered', 'Signed'

  if (!envelopeId || !envelopeStatus) {
    console.error('[DocuSign Webhook] EnvelopeID or Status missing in parsed XML.', { envelopeId, envelopeStatus });
    return NextResponse.json({ error: 'EnvelopeID or Status missing in XML payload' }, { status: 400 });
  }

  console.log(`[DocuSign Webhook] Processing event for Envelope ID: ${envelopeId}, Status: ${envelopeStatus}`);

  // 3. Update Database based on Envelope Status
  // We are primarily interested when the envelope is fully signed/completed.
  // DocuSign uses 'Completed' when all recipients in the workflow have finished.
  // 'Signed' might appear for individual recipients before the envelope is 'Completed'.
  if (envelopeStatus.toLowerCase() === 'completed') {
    try {
      // Check if this envelopeId matches platform_ideator_terms_envelope_id
      let updateResult = await submitterPool.sql`
        UPDATE ideas
        SET platform_ideator_terms_signing_status = 'signed'
        WHERE platform_ideator_terms_envelope_id = ${envelopeId}
          AND platform_ideator_terms_signing_status != 'signed'; -- Avoid redundant updates
      `;

      if (updateResult.rowCount && updateResult.rowCount > 0) {
        console.log(`[DocuSign Webhook DB Update] Updated platform_ideator_terms_signing_status to 'signed' for idea linked to envelope ${envelopeId}.`);
      } else {
        // If no update for platform terms, try idea-specific NDA
        updateResult = await submitterPool.sql`
          UPDATE ideas
          SET idea_specific_nda_signing_status = 'signed'
          WHERE idea_specific_nda_envelope_id = ${envelopeId}
            AND idea_specific_nda_signing_status != 'signed'; -- Avoid redundant updates
        `;
        if (updateResult.rowCount && updateResult.rowCount > 0) {
          console.log(`[DocuSign Webhook DB Update] Updated idea_specific_nda_signing_status to 'signed' for idea linked to envelope ${envelopeId}.`);
        } else {
          console.log(`[DocuSign Webhook DB Update] No idea found or status already 'signed' for envelope ${envelopeId}.`);
        }
      }
    } catch (dbError: unknown) {
      const isDatabaseError = (err: unknown): err is DatabaseError => {
        return typeof err === 'object' && err !== null && 'message' in err;
      };
      
      const errorMessage = isDatabaseError(dbError) ? dbError.message : 'Unknown database error';
      console.error(`[DocuSign Webhook DB Error] Error updating database for envelope ${envelopeId}:`, errorMessage);
      // Don't return error to DocuSign here, as it might retry for a DB issue on our side.
      // Log it thoroughly for investigation.
    }
  } else {
    console.log(`[DocuSign Webhook] Envelope ${envelopeId} status is '${envelopeStatus}'. No DB update action taken for this status.`);
    // You could add logic here to handle other statuses like 'Declined' or 'Voided' if needed
    // For example, set status to 'declined' or 'voided' in your DB.
    if (envelopeStatus.toLowerCase() === 'declined' || envelopeStatus.toLowerCase() === 'voided') {
        const newStatus = envelopeStatus.toLowerCase();
         try {
            let updateResult = await submitterPool.sql`
                UPDATE ideas
                SET platform_ideator_terms_signing_status = ${newStatus}
                WHERE platform_ideator_terms_envelope_id = ${envelopeId}
                AND (platform_ideator_terms_signing_status != 'signed' AND platform_ideator_terms_signing_status != ${newStatus});
            `;
            if (updateResult.rowCount && updateResult.rowCount > 0) {
                console.log(`[DocuSign Webhook DB Update] Updated platform_ideator_terms_signing_status to '${newStatus}' for idea linked to envelope ${envelopeId}.`);
            } else {
                updateResult = await submitterPool.sql`
                    UPDATE ideas
                    SET idea_specific_nda_signing_status = ${newStatus}
                    WHERE idea_specific_nda_envelope_id = ${envelopeId}
                    AND (idea_specific_nda_signing_status != 'signed' AND idea_specific_nda_signing_status != ${newStatus});
                `;
                if (updateResult.rowCount && updateResult.rowCount > 0) {
                    console.log(`[DocuSign Webhook DB Update] Updated idea_specific_nda_signing_status to '${newStatus}' for idea linked to envelope ${envelopeId}.`);
                } else {
                    console.log(`[DocuSign Webhook DB Update] No idea found or status already managed for '${newStatus}' on envelope ${envelopeId}.`);
                }
            }
        } catch (dbError: unknown) {
            const isDatabaseError = (err: unknown): err is DatabaseError => {
              return typeof err === 'object' && err !== null && 'message' in err;
            };
            
            const errorMessage = isDatabaseError(dbError) ? dbError.message : 'Unknown database error';
            console.error(`[DocuSign Webhook DB Error] Error updating database for envelope ${envelopeId} to status '${newStatus}':`, errorMessage);
        }
    }
  }

  // 4. Respond to DocuSign (must be a 200 OK for successful acknowledgement)
  return NextResponse.json({ message: 'Webhook received and processed.' }, { status: 200 });
} 