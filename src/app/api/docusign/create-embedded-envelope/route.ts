import { NextRequest, NextResponse } from 'next/server';
import { getDocusignApiClient, getDocuSignClasses } from '@/app/utils/docusignClient';

const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;

// DocuSign error interface
interface DocuSignError {
  response?: {
    body?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ideaId,
      userAddress,
      ndaContent,
    } = body;

    if (!ideaId || !userAddress || !ndaContent) {
      return NextResponse.json({ 
        error: 'Missing required fields: ideaId, userAddress, ndaContent' 
      }, { status: 400 });
    }

    if (!DOCUSIGN_ACCOUNT_ID) {
      return NextResponse.json({ 
        error: 'DocuSign configuration error' 
      }, { status: 500 });
    }

    const apiClient = await getDocusignApiClient();
    const { EnvelopesApi } = await getDocuSignClasses();
    const envelopesApi = new EnvelopesApi(apiClient);

    // Create HTML document with embedded form fields for name and email
    const documentHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Idea-Specific NDA - Idea #${ideaId}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .form-field { margin: 10px 0; padding: 5px; border: 1px solid #ccc; background-color: #f9f9f9; }
        .content { margin: 20px 0; }
        .signature-section { margin-top: 40px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>IDEA-SPECIFIC NON-DISCLOSURE AGREEMENT</h1>
        <h2>Idea ID: ${ideaId}</h2>
      </div>

      <div class="content">
        <p>This Idea-Specific Non-Disclosure Agreement ("Agreement") is entered into between PoSciDonDAO and the reviewer accessing confidential information for Idea #${ideaId}.</p>
        
        <h3>SIGNER INFORMATION</h3>
        <p>Full Name: <span class="form-field">{{name_textbox}}</span></p>
        <p>Email Address: <span class="form-field">{{email_textbox}}</span></p>
        <p>Wallet Address: ${userAddress}</p>
        
        <h3>1. SPECIFIC CONFIDENTIAL INFORMATION</h3>
        <p>This agreement covers access to:</p>
        <ul>
          <li>Detailed research methodology for Idea #${ideaId}</li>
          <li>Technical specifications and implementation details</li>
          <li>Preliminary research data and findings</li>
          <li>Proprietary algorithms or processes</li>
          <li>Commercial potential and market analysis</li>
        </ul>

        <h3>2. PURPOSE OF DISCLOSURE</h3>
        <p>Information is disclosed solely for:</p>
        <ul>
          <li>Peer review and evaluation</li>
          <li>Due diligence assessment</li>
          <li>Funding decision purposes</li>
          <li>Platform governance voting</li>
        </ul>

        <h3>3. RESTRICTIONS</h3>
        <p>Reviewer agrees to:</p>
        <ul>
          <li>Maintain strict confidentiality of all disclosed information</li>
          <li>Use information only for evaluation purposes</li>
          <li>Not reproduce, distribute, or share information</li>
          <li>Not use information for competing research</li>
          <li>Delete/destroy information upon request</li>
        </ul>

        <h3>4. TERM AND TERMINATION</h3>
        <ul>
          <li>Agreement effective upon DocuSign completion</li>
          <li>Remains in effect for the duration of review process</li>
          <li>Obligations survive termination of access</li>
        </ul>

        <h3>5. LEGAL COMPLIANCE</h3>
        <p>This agreement is legally binding and enforceable under applicable laws.</p>
      </div>

      <div class="signature-section">
        <p><strong>ELECTRONIC SIGNATURE REQUIRED</strong></p>
        <p>By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this NDA.</p>
        
        <p>Signature: {{signature_anchor}}</p>
        <p>Date: {{date_anchor}}</p>
        
        <p><em>This document requires completion of name and email fields above, followed by electronic signature.</em></p>
      </div>
    </body>
    </html>`;

    const documentBase64 = Buffer.from(documentHtml).toString('base64');
    const clientUserId = `${userAddress}_${ideaId}_${Date.now()}`;

    // Create envelope with embedded signer
    const envelopeDefinition = {
      emailSubject: `Please Sign: Idea-Specific NDA for Idea #${ideaId}`,
      documents: [{
        documentBase64: documentBase64,
        name: `Idea_NDA_${ideaId}.html`,
        fileExtension: 'html',
        documentId: '1'
      }],
      recipients: {
        signers: [{
          recipientId: '1',
          routingOrder: '1',
          email: 'placeholder@example.com', // Placeholder, will be filled by user
          name: 'Signer Name', // Placeholder, will be filled by user
          clientUserId: clientUserId,
          tabs: {
            textTabs: [
              {
                tabLabel: 'name_textbox',
                anchorString: '{{name_textbox}}',
                anchorXOffset: '0',
                anchorYOffset: '0',
                anchorUnits: 'pixels',
                required: 'true',
                width: '200',
                height: '20'
              },
              {
                tabLabel: 'email_textbox', 
                anchorString: '{{email_textbox}}',
                anchorXOffset: '0',
                anchorYOffset: '0', 
                anchorUnits: 'pixels',
                required: 'true',
                width: '200',
                height: '20',
                validationPattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
                validationMessage: 'Please enter a valid email address'
              }
            ],
            signHereTabs: [{
              anchorString: '{{signature_anchor}}',
              anchorXOffset: '0',
              anchorYOffset: '0',
              anchorUnits: 'pixels'
            }],
            dateSignedTabs: [{
              anchorString: '{{date_anchor}}',
              anchorXOffset: '0',
              anchorYOffset: '0',
              anchorUnits: 'pixels'
            }]
          }
        }]
      },
      status: 'sent'
    };

    // Create the envelope
    console.log(`[DocuSign] Creating embedded envelope for idea ${ideaId}`);
    const envelopeResults = await envelopesApi.createEnvelope(DOCUSIGN_ACCOUNT_ID, {
      envelopeDefinition
    });

    if (!envelopeResults || !envelopeResults.envelopeId) {
      throw new Error('Failed to create DocuSign envelope');
    }

    const envelopeId = envelopeResults.envelopeId;
    console.log(`[DocuSign] Envelope created: ${envelopeId}`);

    // Create recipient view for embedded signing
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/spark/ideas/${ideaId}?docusign_complete=true`;
    
    const viewRequest = {
      returnUrl: returnUrl,
      authenticationMethod: 'none',
      email: 'placeholder@example.com',
      userName: 'Signer Name',
      clientUserId: clientUserId,
      pingFrequency: '600',
      pingUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    };

    console.log(`[DocuSign] Creating recipient view for envelope ${envelopeId}`);
    const viewResults = await envelopesApi.createRecipientView(DOCUSIGN_ACCOUNT_ID, envelopeId, {
      recipientViewRequest: viewRequest
    });

    if (!viewResults || !viewResults.url) {
      throw new Error('Failed to create DocuSign recipient view');
    }

    const signingUrl = viewResults.url;
    console.log(`[DocuSign] Generated embedded signing URL for envelope ${envelopeId}`);

    return NextResponse.json({
      envelopeId,
      signingUrl,
      clientUserId,
      message: 'Embedded DocuSign envelope created successfully'
    });

  } catch (error: unknown) {
    console.error('[DocuSign API Error] create-embedded-envelope:', error);
    
    // Type guard for DocuSign error
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
      error: 'Failed to create embedded DocuSign envelope',
      details: details
    }, { status });
  }
} 