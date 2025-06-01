import { verifyTypedData } from 'viem';
import { signaturePool } from '@/app/db/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to convert chainId to BigInt if it's not already
const ensureBigInt = (value: string | number | bigint): bigint => {
  if (typeof value === 'bigint') return value;
  return BigInt(value);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const verifySignature = async (domain: any, types: any, message: any, signature: string, address: string) => {
  try {
    console.log('Verifying signature with parameters:', {
      address,
      domain: { ...domain, chainId: domain.chainId.toString() },
      types,
      primaryType: Object.keys(types)[0],
      messagePreview: JSON.stringify({ ...message, chainId: message.chainId.toString() }).slice(0, 200) + '...',
      signaturePreview: signature.slice(0, 20) + '...'
    });

    // Ensure all required fields are present
    if (!domain.name || !domain.version || !domain.chainId) {
      console.error('Missing required domain fields:', { domain });
      return false;
    }

    if (!types.SignIn) {
      console.error('Missing SignIn type definition:', { types });
      return false;
    }

    // Ensure chainId is BigInt in both domain and message
    const verifyDomain = {
      ...domain,
      chainId: ensureBigInt(domain.chainId)
    };

    const verifyMessage = {
      ...message,
      chainId: ensureBigInt(message.chainId)
    };

    // For externally owned accounts (EOAs), verify the signature
    const result = await verifyTypedData({
      address: address as `0x${string}`,
      domain: verifyDomain,
      types,
      primaryType: Object.keys(types)[0],
      message: verifyMessage,
      signature: signature as `0x${string}`
    });

    console.log('Signature verification result:', result);
    return result;
  } catch (error) {
    console.error('Error verifying signature:', {
      error,
      errorMessage: error.message,
      errorStack: error.stack
    });
    return false;
  }
};

export const POST = async (request: NextRequest) => {
  try {
    console.log('Received verification request');
    const { domain, types, message, signature, address } = await request.json();

    // Log the received data
    console.log('Received verification data:', {
      domain: { ...domain, chainId: domain.chainId.toString() },
      types,
      messagePreview: JSON.stringify({ ...message, chainId: message.chainId.toString() }).slice(0, 200) + '...',
      signaturePreview: signature?.slice(0, 20) + '...',
      address
    });

    if (!domain || !types || !message || !signature || !address) {
      const missingParams = {
        domain: !domain,
        types: !types,
        message: !message,
        signature: !signature,
        address: !address
      };
      console.error('Missing parameters:', missingParams);
      return NextResponse.json(
        { success: false, error: 'Missing parameters', details: missingParams },
        { status: 400 }
      );
    }

    const isValid = await verifySignature(
      domain,
      types,
      message,
      signature,
      address
    );

    console.log('Verification result:', { isValid, address });

    if (isValid) {
      // Extract relevant data from the message
      const { chainId, nonce, issued } = message;

      try {
        // Store the data in the database
        await signaturePool.sql`
          INSERT INTO signatures (
            address, 
            chain_id, 
            nonce, 
            issued_at, 
            message, 
            signature, 
            is_valid
          ) VALUES (
            ${address}, 
            ${chainId.toString()}, 
            ${nonce}, 
            ${issued}, 
            ${JSON.stringify({ ...message, chainId: message.chainId.toString() })}, 
            ${signature}, 
            ${isValid}
          )
        `;
        console.log('Successfully stored signature in database');
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue even if database storage fails
      }

      return NextResponse.json({ success: true, isValid });
    } else {
      console.log('Signature verification failed');
      return NextResponse.json({ 
        success: false, 
        isValid,
        error: 'Signature verification failed'
      });
    }
  } catch (error) {
    console.error('Error handling request:', {
      error,
      errorMessage: error.message,
      errorStack: error.stack
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal Server Error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
