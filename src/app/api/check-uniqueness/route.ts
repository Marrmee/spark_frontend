import { NextRequest, NextResponse } from 'next/server';
import { checkPhoneUniqueness, checkGovIdUniqueness, serializeResponse } from '@/app/components/general/CheckUniqueness';

export const POST = async (request: NextRequest) => {
  console.log('[API] Received uniqueness check request');
  try {
    const { userAddress, type, proposalIndex } = await request.json();
    console.log('[API] Request parameters:', { userAddress, type, proposalIndex });

    if (!userAddress || !type) {
      console.error('[API] Missing parameters');
      return NextResponse.json(
        { error: 'Missing userAddress or type parameter' },
        { status: 400 }
      );
    }

    console.log(`[API] Starting ${type} uniqueness check`);
    let responseData;
    try {
      if (type === 'phone') {
        responseData = await checkPhoneUniqueness(userAddress);
        console.log('[API] Phone check result:', JSON.stringify(responseData, (_, v) => 
          typeof v === 'bigint' ? v.toString() : 
          v instanceof Date ? v.toISOString() : v));
      } else if (type === 'govId') {
        responseData = await checkGovIdUniqueness(userAddress);
        console.log('[API] GovId check result:', JSON.stringify(responseData, (_, v) => 
          typeof v === 'bigint' ? v.toString() : 
          v instanceof Date ? v.toISOString() : v));
      } else {
        console.error('[API] Invalid type:', type);
        return NextResponse.json(
          { error: 'Invalid type: must be "phone" or "govId"' },
          { status: 400 }
        );
      }
    } catch (fetchError) {
      console.error('[API] Network or fetch error during uniqueness check:', fetchError);
      return NextResponse.json(
        { 
          error: 'Network error during uniqueness verification. Please try again.',
          details: fetchError.message
        },
        { status: 503 }
      );
    }

    // Prevent BigInt serialization issues
    const serializedData = await serializeResponse(responseData);
    
    // Double check that isUniquePhone or isUniqueGovId is properly set in the serialized data
    if (type === 'phone' && serializedData) {
      console.log('[API] Serialized phone data isUniquePhone:', serializedData.isUniquePhone);
    } else if (type === 'govId' && serializedData) {
      console.log('[API] Serialized govId data isUniqueGovId:', serializedData.isUniqueGovId);
    }
    
    console.log('[API] Sending successful response');
    return NextResponse.json(serializedData, { status: 200 });
  } catch (error) {
    console.error('[API] Error in uniqueness check:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
