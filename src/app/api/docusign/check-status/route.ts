import { NextRequest, NextResponse } from 'next/server';
import { getDocusignApiClient, getDocuSignClasses } from '@/app/utils/docusignClient';

// Updated environment variables to match DocuSign's actual terminology
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const envelopeId = searchParams.get('envelopeId');

    if (!envelopeId) {
      return NextResponse.json({ error: 'Missing envelopeId parameter' }, { status: 400 });
    }

    const apiClient = await getDocusignApiClient();
    const { EnvelopesApi } = await getDocuSignClasses();
    const envelopesApi = new EnvelopesApi(apiClient);

    // Get envelope status
    const envelope = await envelopesApi.getEnvelope(DOCUSIGN_ACCOUNT_ID!, envelopeId);

    if (!envelope) {
      return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });
    }

    // Get recipients to check individual signing status
    const recipients = await envelopesApi.listRecipients(DOCUSIGN_ACCOUNT_ID!, envelopeId);

    const response = {
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      statusDateTime: envelope.statusChangedDateTime,
      completed: envelope.status === 'completed',
      recipients: recipients.signers?.map(signer => ({
        email: signer.email,
        name: signer.name,
        status: signer.status,
        signedDateTime: signer.signedDateTime,
        clientUserId: signer.clientUserId
      })) || []
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('[DocuSign API Error] /api/docusign/check-status:', error);
    
    // Type guard for DocuSign error
    const isDocuSignError = (err: unknown): err is DocuSignError => {
      return typeof err === 'object' && err !== null && 'message' in err;
    };
    
    if (isDocuSignError(error) && error.response && error.response.body) {
      const docusignError = error.response.body;
      return NextResponse.json({ 
        error: 'DocuSign API error', 
        details: docusignError.message || 'Unknown DocuSign error'
      }, { status: 500 });
    }
    
    const errorMessage = isDocuSignError(error) ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to check DocuSign status', 
      details: errorMessage 
    }, { status: 500 });
  }
} 