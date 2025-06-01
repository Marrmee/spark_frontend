import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface IntegrityViolationReport {
  filename: string;
  expectedHash: string;
  actualHash: string;
  timestamp: string;
  userAgent: string;
}

/**
 * API endpoint to handle integrity violation reports
 * This endpoint receives reports when a client detects a file integrity violation
 * and logs them for security monitoring
 */
export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const report: IntegrityViolationReport = await request.json();
    
    // Validate the report data
    if (!report.filename || !report.expectedHash || !report.actualHash) {
      return NextResponse.json(
        { error: 'Invalid report data' },
        { status: 400 }
      );
    }
    
    // Log the violation (in production, this would send to a security monitoring system)
    console.error('SECURITY ALERT: Integrity violation detected', {
      ...report,
      ip,
      severity: 'HIGH',
    });
    
    // In a production environment, you would:
    // 1. Store the report in a database
    // 2. Send alerts to security team
    // 3. Potentially trigger automated response actions
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing integrity violation report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 