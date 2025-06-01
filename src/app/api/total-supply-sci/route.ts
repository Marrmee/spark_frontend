import { getTotalSupplySci } from '@/app/components/balances/getters/GetTotalSupplySci';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Call the getTotalSupplySci function (which already gets networkInfo internally)
    const totalSupplySci = await getTotalSupplySci();
    console.log('Total Supply SCI:', totalSupplySci);
    // Return the response with cache headers
    return NextResponse.json(
      {
        success: true,
        totalSupplySci: Number(totalSupplySci),
        timestamp: Date.now()
      },
      {
        status: 200,
        headers: {
          // Cache for 30 seconds
          'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60'
        }
      }
    );
  } catch (error) {
    console.error('API Error fetching total supply SCI:', error);
    
    return NextResponse.json(
      {
        success: false,
        totalSupplySci: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 