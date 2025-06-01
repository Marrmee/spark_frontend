import { NextResponse } from 'next/server';
import { getNetworkInfo } from '../../utils/serverConfig';
import { recordRequestResult, shouldAllowRequest } from '@/app/utils/circuitBreaker';

// Service name for circuit breaker
const SERVICE_NAME = 'network-info';

export const GET = async () => {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Check circuit breaker
    const circuitCheck = await shouldAllowRequest(SERVICE_NAME);
    if (!circuitCheck.allowed) {
      // Circuit is open, return service unavailable
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          circuitState: circuitCheck.state,
          retryAfter: Math.ceil(circuitCheck.remainingTimeMs / 1000)
        },
        { 
          status: 503,
          headers: {
            'Retry-After': Math.ceil(circuitCheck.remainingTimeMs / 1000).toString(),
            'X-Circuit-State': circuitCheck.state
          }
        }
      );
    }
    
    const networkInfo = await getNetworkInfo();
    success = true; // Mark operation as successful
    return NextResponse.json(networkInfo);
  } catch (error) {
    console.error('Error fetching network info:', error);
    return NextResponse.json({ error: 'Failed to fetch network info' }, { status: 500 });
  } finally {
    // Always record the request result for the circuit breaker
    try {
      await recordRequestResult(SERVICE_NAME, success);
      
      // Log performance metrics
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`⚠️ API: Slow request to ${SERVICE_NAME} - ${duration}ms`);
      }
    } catch (error) {
      console.error('Failed to record request result:', error);
    }
  }
}