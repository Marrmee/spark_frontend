import { NextRequest, NextResponse } from 'next/server';
import { submitterPool } from '@/app/db/db';
import { getDocusignApiClient, getDocuSignClasses } from '@/app/utils/docusignClient';
import { validateRecaptcha } from '@/app/utils/recaptchaUtils';
import { Buffer } from 'buffer';

// DOCUSIGN_ACCOUNT_ID is still needed here for specific API calls like template/envelope creation
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;

// DocuSign interfaces
interface DocuSignError {
  response?: {
    body?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}

interface IdeaDetails {
  ideaTitle: string;
  ideaDescription: string;
  patentId?: string;
  licenseUri?: string;
}

interface SignerInfo {
  signerName: string;
  signerEmail: string;
  userAddress: string;
}

// --- BOILERPLATE CONTENT GENERATION ---

function getPlatformIdeatorTermsContent(ideaDetails: IdeaDetails, signerInfo: SignerInfo): string {
  const submissionDate = new Date().toLocaleDateString(); // This will serve as the Effective Date
  // Content derived from Spark Whitepaper V2.0, with legal clauses adapted from SAT
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Platform Ideator Terms - ${ideaDetails.ideaTitle}</title>
      <style>body { font-family: sans-serif; margin: 20px; } h1, h2 { color: #333; } p { line-height: 1.6; } .signature-block { margin-top: 40px; }</style>
    </head>
    <body>
      <h1>Platform Ideator Terms (Idea-Specific)</h1>
      <p><strong>Effective Date:</strong> ${submissionDate}</p>
      <p>This Platform Ideator Terms Agreement ("Agreement") is entered into as of the Effective Date by and between:</p>
      <p><strong>Ideator:</strong> ${signerInfo.signerName} (User Address: ${signerInfo.userAddress})</p>
      <p>and</p>
      <p><strong>The Platform Operator:</strong> PoSciDonDAO Foundation, a Panama Based Private Interest Foundation incorporated on December 12, 2023, with registration folio no. 25055163 (hereinafter referred to as the "Foundation" or "Platform").</p>
      
      <p><strong>Regarding:</strong> The Ideator's submission of an idea titled "${ideaDetails.ideaTitle}" (the "Idea"), described as: "${ideaDetails.ideaDescription}".</p>

      <h2>1. Introduction to Spark & Poscidon</h2>
      <p>The Ideator acknowledges that Spark is an idea commitment engine built to unlock collaboration, crypto-powered incentives, and shared upside, operating as a protocol component of Poscidon, a decentralized autonomous organization (DAO) and initiative of the Foundation. Spark leverages the DAO's token, SCI. The goal is to foster open innovation and enable inventors to bring bold ideas to life.</p>

      <h2>2. The Idea Submission</h2>
      <p>The Ideator represents that the Idea is original and has been described with sufficient detail for evaluation. The Ideator understands the Idea will be submitted to the Foundation's Review Committee for assessment under the terms of the concurrently signed Idea-Specific Non-Disclosure Agreement.</p>

      <h2>3. Intellectual Property & Spark\'s Defensive Copyleft IP Pool</h2>
      <p>The Ideator understands that, if the Idea is approved, funded, and developed under the auspices of the Foundation, it may be converted into an Intellectual Property Non-Fungible Token (IP-NFT) within Spark's defensive copyleft IP pool. This means:</p>
      <ul>
        <li>Spark patents are used defensively to prevent others from patenting the invention or incremental innovations based on it.</li>
        <li>A copyleft clause requires any modifications to licensed material to be released under the same license, ensuring improvements are shared back into the pool.</li>
        <li>The public is free to use patents in Spark's pool for non-commercial purposes without requiring permission, though access to underlying IP might be gated by SCI tokens.</li>
      </ul>

      <h2>4. Commercialization of IP-NFTs</h2>
      <p>The Ideator acknowledges that commercial use of an IP-NFT requires obtaining a non-tradable License-NFT. This involves paying a fee and locking SCI tokens through the Poscidon Protocol (operated by the Foundation). Revenue generated from these licenses will be distributed based on an on-chain proposal, considering the inventor's contributions, contributions from the community, and the Foundation's treasury, as outlined in the Spark Whitepaper (Version 2.0, May 19, 2025).</p>

      <h2>5. Ideator's Role & Contributions</h2>
      <p>The Ideator understands that the Idea may undergo further development and improvement through collaboration with Poscidon's community, managed by the Foundation. Contributions (financial, non-financial, or in-kind) are incentivized, potentially through Proof of Impact NFTs, based on on-chain proposals and verified value.</p>

      <h2>6. Governance</h2>
      <p>The Ideator acknowledges that Spark leverages Poscidon's governance infrastructure, overseen by the Foundation. Participation in early phases of idea development and related governance may require signing Non-Disclosure Agreements (NDAs) and locking SCI tokens, as detailed in the Spark Whitepaper.</p>

      <h2>7. Representations & Warranties by Ideator</h2>
      <p>The Ideator warrants that the Idea is original to the best of their knowledge, does not infringe upon the intellectual property rights of any third party, and that all information provided in relation to the Idea is true and accurate.</p>

      <h2>8. Confidentiality</h2>
      <p>The confidentiality of the Idea during the review and initial development phases is governed by the Idea-Specific Non-Disclosure Agreement signed concurrently by the Ideator with the Foundation.</p>
      
      <h2>9. Governing Law</h2>
      <p>This Agreement shall be governed by and construed under Panamanian Law, regardless of the laws that might otherwise govern under applicable principles of conflicts of laws.</p>

      <h2>10. Dispute Resolution</h2>
      <p>Any dispute, claim, or controversy arising out of or relating to this Agreement shall be determined by arbitration in Panama, or at a location of the Foundation's choice, before an arbitrator mutually agreed upon by the parties. The arbitration shall be administered by JAMS (or a similar internationally recognized arbitration institution mutually agreed upon) pursuant to its Comprehensive Arbitration Rules and Procedures. Judgment on the award may be entered in any court having jurisdiction. This clause shall not preclude parties from seeking provisional remedies in aid of arbitration from a court of appropriate jurisdiction. In any arbitration arising out of or related to this Agreement, the arbitrator shall award to the prevailing party, if any, the costs and attorneys' fees reasonably incurred by the prevailing party in connection with the arbitration.</p>

      <h2>11. Agreement to Terms</h2>
      <p>By signing below, the Ideator acknowledges they have read, understood, and agree to these Platform Ideator Terms as derived from the principles of the Spark Whitepaper (Version 2.0, May 19, 2025) and the specific terms herein.</p>

      <div class="signature-block">
        <p>Ideator Signature: <span>{{DS_SIGNATURE_IDEATOR}}</span></p>
        <p>Printed Name: ${signerInfo.signerName}</p>
        <p>Date: <span>{{DS_DATE_SIGNED_IDEATOR}}</span></p>
      </div>
    </body>
    </html>
  `;
}

function getIdeaSpecificNDAContent(ideaDetails: IdeaDetails, signerInfo: SignerInfo): string {
  const submissionDate = new Date().toLocaleDateString(); // This will serve as the Effective Date
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Idea-Specific Non-Disclosure Agreement - ${ideaDetails.ideaTitle}</title>
      <style>body { font-family: sans-serif; margin: 20px; } h1, h2 { color: #333; } p { line-height: 1.6; } .signature-block { margin-top: 40px; }</style>
    </head>
    <body>
      <h1>Idea-Specific Non-Disclosure Agreement (NDA)</h1>
      <p><strong>Effective Date:</strong> ${submissionDate}</p>
      <p>This Non-Disclosure Agreement ("NDA") is entered into as of the Effective Date by and between:</p>
      <p><strong>Disclosing Party:</strong> ${signerInfo.signerName} (User Address: ${signerInfo.userAddress}) ("Ideator")</p>
      <p>and</p>
      <p><strong>Receiving Party:</strong> PoSciDonDAO Foundation, a Panama Based Private Interest Foundation incorporated on December 12, 2023, with registration folio no. 25055163 (hereinafter referred to as the "Foundation" or "Poscidon"), and its authorized reviewers acting on its behalf.</p>
      
      <p>For the purpose of evaluating the Ideator's submission titled "${ideaDetails.ideaTitle}" (the "Idea") for potential inclusion and development within the Spark Platform (an initiative of the Foundation), as described in the Spark Whitepaper (Version 2.0, May 19, 2025).</p>

      <h2>1. Definition of Confidential Information</h2>
      <p>For purposes of this NDA, "Confidential Information" shall include the Idea itself, specifically its title: "${ideaDetails.ideaTitle}", its detailed description: "${ideaDetails.ideaDescription}", ${ideaDetails.patentId ? `any associated provisional patent ID: "${ideaDetails.patentId}",` : ''} ${ideaDetails.licenseUri ? `any associated license URI: "${ideaDetails.licenseUri}",` : ''} and any other technical, business, or other information related to the Idea disclosed by the Ideator to the Foundation, whether orally, in writing, or by any other means. Confidential Information does not include information that: (a) is or becomes publicly known through no wrongful act of the Foundation; (b) was in the Foundation's rightful possession prior to disclosure by Ideator; (c) is independently developed by the Foundation without reference to the Ideator's Confidential Information.</p>

      <h2>2. Obligations of Receiving Party (Foundation)</h2>
      <p>The Foundation agrees to:</p>
      <ul>
        <li>Maintain the Confidential Information in strict confidence.</li>
        <li>Use the Confidential Information solely for the purpose of evaluating the Idea for the Spark Platform, including review by its expert committee and, if applicable, peer reviewers and DAO members who have also signed an appropriate NDA (as per Spark Whitepaper Section 2.1 & 3).</li>
        <li>Limit disclosure of Confidential Information to its authorized personnel, reviewers, and DAO members who have a need to know for evaluation or contribution purposes and are bound by confidentiality obligations substantially similar to those herein.</li>
      </ul>

      <h2>3. Permitted Disclosures</h2>
      <p>Notwithstanding the above, the Foundation may disclose Confidential Information if and to the extent required by law, provided the Foundation gives the Ideator prompt written notice of such requirement (if legally permissible) to allow the Ideator to seek a protective order.</p>

      <h2>4. Term of Confidentiality</h2>
      <p>The obligations of confidentiality herein shall remain in effect for a period of five (5) years from the date of disclosure, or until such time as the Idea is formally accepted into the Spark IP-NFT pool and becomes subject to the Spark Platform's open access and copyleft terms, or the information otherwise ceases to be confidential through no fault of the Foundation, whichever occurs first.</p>

      <h2>5. No License or Rights Granted</h2>
      <p>This NDA does not grant the Foundation any license or rights to the Confidential Information except for the limited right to review and evaluate as set forth herein.</p>
      
      <h2>6. Governing Law</h2>
      <p>This NDA shall be governed by and construed under Panamanian Law, regardless of the laws that might otherwise govern under applicable principles of conflicts of laws.</p>

      <h2>7. Dispute Resolution</h2>
      <p>Any dispute, claim, or controversy arising out of or relating to this NDA shall be determined by arbitration in Panama, or at a location of the Foundation's choice, before an arbitrator mutually agreed upon by the parties. The arbitration shall be administered by JAMS (or a similar internationally recognized arbitration institution mutually agreed upon) pursuant to its Comprehensive Arbitration Rules and Procedures. Judgment on the award may be entered in any court having jurisdiction. This clause shall not preclude parties from seeking provisional remedies in aid of arbitration from a court of appropriate jurisdiction. In any arbitration arising out of or related to this NDA, the arbitrator shall award to the prevailing party, if any, the costs and attorneys' fees reasonably incurred by the prevailing party in connection with the arbitration.</p>

      <h2>8. Acknowledgement</h2>
      <p>The Ideator acknowledges that the Foundation and the Spark Platform operate on principles of open innovation as detailed in the Spark Whitepaper, and that the ultimate goal, if the Idea is accepted, is its inclusion in a defensive copyleft IP pool.</p>

      <div class="signature-block">
        <p>Ideator (Disclosing Party) Signature: <span>{{DS_SIGNATURE_IDEATOR}}</span></p>
        <p>Printed Name: ${signerInfo.signerName}</p>
        <p>Date: <span>{{DS_DATE_SIGNED_IDEATOR}}</span></p>
      </div>
      
      <!-- Note: Poscidon DAO's signature would typically be handled as a counter-signature. 
           This embedded signing flow is primarily for the Ideator. -->
    </body>
    </html>
  `;
}


// --- DOCUSIGN HELPER FUNCTIONS (Adapted from initiate-signing/route.ts) ---

async function createTemplateAndInitiateSigning(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiClient: any,
  documentContentHtml: string,
  documentName: string, // e.g., "Platform Ideator Terms for My Idea"
  templateBaseName: string, // e.g., "Platform Ideator Terms"
  signerInfo: SignerInfo,
  ideaDetails: IdeaDetails,
  returnUrl: string
): Promise<{ signingUrl: string; envelopeId: string; clientUserId: string; templateId: string }> {
  const { TemplatesApi, EnvelopesApi } = await getDocuSignClasses();
  const templatesApi = new TemplatesApi(apiClient);
  const envelopesApi = new EnvelopesApi(apiClient);

  if (!DOCUSIGN_ACCOUNT_ID) {
      throw new Error('DOCUSIGN_ACCOUNT_ID is not configured.');
  }

  const templateName = `${templateBaseName} - ${ideaDetails.ideaTitle.substring(0, 30)} - ${Date.now()}`;
  const documentBase64 = Buffer.from(documentContentHtml).toString('base64');

  const templateRequest = {
    envelopeTemplate: {
      name: templateName,
      description: `Dynamically generated template for ${templateBaseName} related to idea: ${ideaDetails.ideaTitle}`,
      emailSubject: `Please Sign: ${documentName}`,
      shared: "false",
      documents: [{
        documentBase64: documentBase64,
        name: documentName,
        fileExtension: 'html',
        documentId: '1'
      }],
      recipients: {
        signers: [{
          recipientId: '1',
          roleName: 'Ideator', // This roleName must match in envelope creation
          routingOrder: '1',
          tabs: { // Define tabs based on anchor strings in the HTML
            signHereTabs: [{ anchorString: '{{DS_SIGNATURE_IDEATOR}}', anchorYOffset: '0', anchorUnits: 'pixels' }],
            dateSignedTabs: [{ anchorString: '{{DS_DATE_SIGNED_IDEATOR}}', anchorYOffset: '0', anchorUnits: 'pixels' }]
          }
        }]
      },
      status: "created"
    }
  };

  console.log(`[DocuSign API] Creating template: ${templateName}`);
  let newTemplate;
  try {
    newTemplate = await templatesApi.createTemplate(DOCUSIGN_ACCOUNT_ID, templateRequest);
  } catch (error: unknown) {
    const isDocuSignError = (err: unknown): err is DocuSignError => {
      return typeof err === 'object' && err !== null && 'message' in err;
    };
    
    const errorMessage = isDocuSignError(error) ? error.message : 'Unknown error occurred';
    console.error(`[DocuSign API Error] Failed to create template '${templateName}':`, errorMessage);
    throw new Error(`Failed to create DocuSign template '${templateName}'. Details: ${errorMessage}`);
  }
  
  if (!newTemplate || !newTemplate.templateId) {
    throw new Error('Failed to create DocuSign template, no templateId received.');
  }
  const templateId = newTemplate.templateId;
  console.log(`[DocuSign API] Template created: ${templateId} (${templateName})`);

  // 2. Create Envelope from the new template
  const clientUserId = `${signerInfo.userAddress}_${templateBaseName.replace(/\s+/g, '_')}_${Date.now()}`;
  
  const envelopeDefinition = {
    templateId: templateId,
    templateRoles: [{
      email: signerInfo.signerEmail,
      name: signerInfo.signerName,
      clientUserId: clientUserId,
      roleName: 'Ideator', // Must match roleName in template
      // No need to define tabs here if they are on the template and assigned to the role
    }],
    status: 'sent' // This will send the envelope for signature immediately
  };

  console.log(`[DocuSign API] Creating envelope from template ${templateId} for ${signerInfo.signerEmail}`);
  const envelopeResults = await envelopesApi.createEnvelope(DOCUSIGN_ACCOUNT_ID, { envelopeDefinition });

  if (!envelopeResults || !envelopeResults.envelopeId) {
    throw new Error('Failed to create DocuSign envelope from dynamic template.');
  }
  const envelopeId = envelopeResults.envelopeId;
  console.log(`[DocuSign API] Envelope created: ${envelopeId} from template ${templateId}`);

  // 3. Create Recipient View for embedded signing
  const viewRequest = {
    returnUrl: returnUrl,
    authenticationMethod: 'none',
    email: signerInfo.signerEmail,
    userName: signerInfo.signerName,
    clientUserId: clientUserId,
    pingFrequency: '600',
    pingUrl: new URL(returnUrl).origin, // Base URL for pings
  };

  console.log(`[DocuSign API] Creating recipient view for envelope ${envelopeId}`);
  const viewResults = await envelopesApi.createRecipientView(DOCUSIGN_ACCOUNT_ID, envelopeId, { recipientViewRequest: viewRequest });

  if (!viewResults || !viewResults.url) {
    throw new Error('Failed to create DocuSign recipient view.');
  }
  const signingUrl = viewResults.url;
  console.log(`[DocuSign API] Generated signing URL for envelope ${envelopeId}`);

  return { signingUrl, envelopeId, clientUserId, templateId };
}


// --- MAIN POST HANDLER ---
export async function POST(request: NextRequest) {
  if (!DOCUSIGN_ACCOUNT_ID) {
    console.error('DOCUSIGN_ACCOUNT_ID is not configured for POST.');
    return NextResponse.json({ error: 'Server configuration error: DocuSign Account ID missing.' }, { status: 500 });
  }
  try {
    const body = await request.json();
    const {
      ideaId, // ID of the idea in the database
      userAddress, // To link DocuSign activity back to the user
      signerEmail,
      signerName,
      returnUrl, // Where to redirect the user after signing
      recaptchaToken, // reCAPTCHA token for security
      ideaTitle, // Still needed for document content generation
      ideaDescription, // Still needed for document content generation
      patentId, // Optional, for document content
      licenseUri, // Optional, for document content
    } = body;

    // Basic validation
    if (!ideaId || !userAddress || !signerEmail || !signerName || !returnUrl || !recaptchaToken || !ideaTitle || !ideaDescription) {
      return NextResponse.json({ error: 'Missing required fields including ideaId, userAddress, signerEmail, signerName, returnUrl, recaptchaToken, ideaTitle, and ideaDescription.' }, { status: 400 });
    }

    // Validate reCAPTCHA
    const recaptchaValidation = await validateRecaptcha(recaptchaToken);
    if (!recaptchaValidation.verified) {
      return NextResponse.json(
        { error: recaptchaValidation.errorResponse?.error || 'Security verification failed' },
        { status: recaptchaValidation.errorResponse?.status || 403 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signerEmail)) {
      return NextResponse.json({ error: 'Invalid email format for signerEmail' }, { status: 400 });
    }

    const ideaDetails: IdeaDetails = { ideaTitle, ideaDescription, patentId, licenseUri };
    const signerInfo: SignerInfo = { signerName, signerEmail, userAddress };

    const apiClient = await getDocusignApiClient();

    // Generate content for Platform Ideator Terms
    const platformTermsHtml = getPlatformIdeatorTermsContent(ideaDetails, signerInfo);
    // Generate content for Idea-Specific NDA
    const ndaHtml = getIdeaSpecificNDAContent(ideaDetails, signerInfo);

    // Process Platform Ideator Terms
    console.log(`[DocuSign Flow] Initiating Platform Ideator Terms for idea ID: ${ideaId}, title: "${ideaTitle}"`);
    const platformTermsResult = await createTemplateAndInitiateSigning(
      apiClient,
      platformTermsHtml,
      `Platform Ideator Terms for: ${ideaTitle}`,
      "Platform Ideator Terms",
      signerInfo,
      ideaDetails,
      returnUrl
    );

    // Process Idea-Specific NDA
    console.log(`[DocuSign Flow] Initiating Idea-Specific NDA for idea ID: ${ideaId}, title: "${ideaTitle}"`);
    const ndaResult = await createTemplateAndInitiateSigning(
      apiClient,
      ndaHtml,
      `Idea-Specific NDA for: ${ideaTitle}`,
      "Idea-Specific NDA",
      signerInfo,
      ideaDetails,
      returnUrl // Potentially a different returnUrl if needed, or append params
    );

    // Update the database record for the idea with DocuSign info
    try {
      const updateResult = await submitterPool.sql`
        UPDATE ideas
        SET 
          platform_ideator_terms_envelope_id = ${platformTermsResult.envelopeId},
          platform_ideator_terms_template_id = ${platformTermsResult.templateId},
          platform_ideator_terms_client_user_id = ${platformTermsResult.clientUserId},
          platform_ideator_terms_signing_status = 'pending_signature',
          idea_specific_nda_envelope_id = ${ndaResult.envelopeId},
          idea_specific_nda_template_id = ${ndaResult.templateId},
          idea_specific_nda_client_user_id = ${ndaResult.clientUserId},
          idea_specific_nda_signing_status = 'pending_signature'
        WHERE id = ${ideaId};
      `;
      if (updateResult.rowCount === 0) {
        // This is a critical error, as the ideaId should exist if this route is called correctly.
        console.error(`[DocuSign DB Update] Failed to update idea ID ${ideaId} with DocuSign details. Idea not found or no rows affected.`);
        // Depending on desired behavior, you might want to try and void the DocuSign envelopes here,
        // or just log and return an error indicating a desync.
        return NextResponse.json({ error: 'Failed to link DocuSign agreements to idea. Idea record not updated.' }, { status: 500 });
      }
      console.log(`[DocuSign DB Update] Successfully updated idea ID ${ideaId} with DocuSign details.`);
    } catch (error: unknown) {
      const isDocuSignError = (err: unknown): err is DocuSignError => {
        return typeof err === 'object' && err !== null && 'message' in err;
      };
      
      const errorMessage = isDocuSignError(error) ? error.message : 'Unknown database error';
      console.error('[Database Error] Failed to update idea with DocuSign information:', errorMessage);
      
      // Don't fail the entire request if database update fails
      console.warn('Continuing despite database update failure. DocuSign URLs generated successfully.');
    }

    return NextResponse.json({
      message: 'DocuSign signing processes initiated successfully and linked to idea.',
      platformIdeatorTerms: {
        signingUrl: platformTermsResult.signingUrl,
        envelopeId: platformTermsResult.envelopeId,
        clientUserId: platformTermsResult.clientUserId,
        templateId: platformTermsResult.templateId,
      },
      ideaSpecificNDA: {
        signingUrl: ndaResult.signingUrl,
        envelopeId: ndaResult.envelopeId,
        clientUserId: ndaResult.clientUserId,
        templateId: ndaResult.templateId,
      }
    });

  } catch (error: unknown) {
    console.error('[DocuSign API Error] /api/docusign/initiate-signing:', error);

    const isDocuSignError = (err: unknown): err is DocuSignError => {
      return typeof err === 'object' && err !== null && 'message' in err;
    };

    let status = 500;
    let details = 'Unknown error occurred';

    if (isDocuSignError(error)) {
      details = error.message;
      if (error.response?.body?.message) {
        details = error.response.body.message;
      }
      if (error.response?.status) {
        status = error.response.status;
      }
    }

    return NextResponse.json({
      error: 'Failed to initiate DocuSign signing process',
      details: details
    }, { status });
  }
} 