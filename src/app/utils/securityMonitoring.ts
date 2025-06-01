/**
 * Security monitoring utilities for the application
 * These functions help track and report security events
 */

/**
 * Security event types for monitoring
 */
export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'authentication_failure',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  INTEGRITY_VIOLATION = 'integrity_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CONTENT_MODERATION_FLAG = 'content_moderation_flag',
  SCAM_DETECTED = 'scam_detected',
  INVALID_INPUT = 'invalid_input',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  TRANSACTION_SECURITY_ISSUE = 'transaction_security_issue',
  CIRCUIT_RESET = 'circuit_reset',
  BOT_DETECTED = 'bot_detected',
  BLACKLIST_MODIFIED = 'blacklist_modified'
}

/**
 * Severity levels for security events
 */
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Interface for security event details
 */
export interface SecurityEvent {
  id?: string;
  eventType: SecurityEventType | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
  severity: SecurityEventSeverity;
  timestamp?: string;
  environment?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs a security event for monitoring
 * @param event The security event to log or event type
 * @param details Details about the event (if first param is event type)
 * @param severity The severity of the event (if first param is event type)
 * @param userId Optional user identifier (if first param is event type)
 */
export async function logSecurityEvent(
  eventOrType: SecurityEventType | SecurityEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>,
  severity?: SecurityEventSeverity,
  userId?: string
): Promise<void> {
  try {
    let event: SecurityEvent;
    
    // Check if first parameter is a SecurityEvent object
    if (typeof eventOrType === 'object') {
      event = {
        ...eventOrType,
        timestamp: eventOrType.timestamp || new Date().toISOString(),
        environment: eventOrType.environment || process.env.NODE_ENV || 'development'
      };
    } else {
      // First parameter is event type
      if (!details || !severity) {
        throw new Error('Details and severity are required when providing event type');
      }
      
      event = {
        eventType: eventOrType,
        details,
        severity,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        userId
      };
    }
    
    // Add browser information if available
    if (typeof window !== 'undefined' && !event.userAgent) {
      event.userAgent = navigator.userAgent;
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`SECURITY EVENT [${event.severity.toUpperCase()}]: ${event.eventType}`, event.details);
      return;
    }
    
    // In production, send to security monitoring endpoint
    try {
      await fetch('/api/security/log-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Fallback to console logging if API call fails
      console.error(`Failed to send security event to API: ${event.eventType}`, error);
      console.warn(`SECURITY EVENT [${event.severity.toUpperCase()}]: ${event.eventType}`, event.details);
    }
    
    // For critical events, also log to console
    if (event.severity === 'critical') {
      console.error(`CRITICAL SECURITY EVENT: ${event.eventType}`, event.details);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Checks if a security event should trigger an immediate action
 * @param event The security event to check
 * @returns Whether immediate action is required
 */
export function requiresImmediateAction(event: SecurityEvent): boolean {
  // Critical events always require immediate action
  if (event.severity === 'critical') {
    return true;
  }
  
  // High severity events for certain types require immediate action
  if (event.severity === 'high') {
    const highSeverityActionTypes = [
      SecurityEventType.INTEGRITY_VIOLATION,
      SecurityEventType.SCAM_DETECTED,
      SecurityEventType.TRANSACTION_SECURITY_ISSUE
    ];
    
    return highSeverityActionTypes.includes(event.eventType as SecurityEventType);
  }
  
  return false;
}

/**
 * Gets recommended actions for a security event
 * @param event The security event
 * @returns List of recommended actions
 */
export function getRecommendedActions(event: SecurityEvent): string[] {
  const actions: string[] = [];
  
  switch (event.eventType) {
    case SecurityEventType.AUTHENTICATION_FAILURE:
      actions.push('Review authentication logs');
      actions.push('Check for brute force attempts');
      if (event.severity === 'high' || event.severity === 'critical') {
        actions.push('Consider temporary account lockout');
      }
      break;
      
    case SecurityEventType.INTEGRITY_VIOLATION:
      actions.push('Verify file integrity');
      actions.push('Check for unauthorized modifications');
      actions.push('Review deployment processes');
      if (event.severity === 'critical') {
        actions.push('Consider emergency maintenance');
      }
      break;
      
    case SecurityEventType.SCAM_DETECTED:
      actions.push('Review flagged content');
      actions.push('Assess impact on users');
      if (event.severity === 'high' || event.severity === 'critical') {
        actions.push('Remove content immediately');
        actions.push('Notify affected users');
      }
      break;
      
    case SecurityEventType.TRANSACTION_SECURITY_ISSUE:
      actions.push('Review transaction details');
      actions.push('Check for unauthorized transactions');
      if (event.severity === 'high' || event.severity === 'critical') {
        actions.push('Consider pausing affected functionality');
        actions.push('Notify security team immediately');
      }
      break;
      
    default:
      actions.push('Review event details');
      actions.push('Assess potential impact');
      if (event.severity === 'critical') {
        actions.push('Escalate to security team');
      }
  }
  
  return actions;
} 