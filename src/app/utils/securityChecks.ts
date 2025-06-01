interface ScamCheckResult {
  detected: boolean;
  pattern?: string;
}

/**
 * Checks for common scam patterns in text
 * @param text The text to check for scam patterns
 * @returns Result indicating if a scam pattern was detected
 */
export function checkForScamPatterns(text: string): ScamCheckResult {
  const scamPatterns = [
    {
      pattern: /\b(free|bonus|guaranteed|unlimited)\s+(tokens?|eth|money|cash|coins?)\b/i,
      description: 'Promises of free or guaranteed tokens/money'
    },
    {
      pattern: /\b(double|triple|multiply)\s+your\s+(investment|money|tokens?|eth)\b/i,
      description: 'Promises of multiplying investments'
    },
    {
      pattern: /\b(urgent|emergency|limited\s+time|act\s+now|expires?\s+soon)\b/i,
      description: 'High-pressure tactics or artificial urgency'
    },
    {
      pattern: /\b(private|secret|exclusive)\s+(sale|deal|offer|opportunity)\b/i,
      description: 'Claims of exclusive or private deals'
    },
    {
      pattern: /\b(send|transfer|deposit)\s+(eth|tokens?|coins?|funds?)\s+to\b/i,
      description: 'Requests for direct token transfers'
    },
    {
      pattern: /\b(risk[- ]free|100%\s+safe|no\s+risk)\b/i,
      description: 'Unrealistic safety claims'
    },
    {
      pattern: /\b(whitelist|presale|pre-sale)\s+(spot|access|opportunity)\b/i,
      description: 'Suspicious presale tactics'
    },
    {
      pattern: /\b(bypass|circumvent|override)\s+(governance|voting|rules|security)\b/i,
      description: 'Attempts to bypass governance'
    },
    {
      pattern: /\b(airdrop|claim|reward)\s+(available|now|tokens?)\b/i,
      description: 'Suspicious token claims or airdrops'
    },
    {
      pattern: /\b(upgrade|modify|change)\s+(contract|owner|admin|permission)\b/i,
      description: 'Suspicious contract modifications'
    }
  ];

  const lowercaseText = text.toLowerCase();
  
  for (const {pattern, description} of scamPatterns) {
    if (pattern.test(lowercaseText)) {
      return {
        detected: true,
        pattern: description
      };
    }
  }

  return {
    detected: false
  };
}

// Helper function to check if a pattern match is in a whitelisted context
const isPatternInWhitelistedContext = (text: string, match: string): boolean => {
  // Define context windows (number of characters before and after the match to check)
  const contextWindow = 50;
  
  // Find the match position
  const matchPosition = text.toLowerCase().indexOf(match.toLowerCase());
  if (matchPosition === -1) return false;
  
  // Extract the context around the match
  const startPos = Math.max(0, matchPosition - contextWindow);
  const endPos = Math.min(text.length, matchPosition + match.length + contextWindow);
  const context = text.substring(startPos, endPos);
  
  // Check if the context contains any whitelisted phrases
  const academicContextPhrases = [
    'research', 'scientific', 'study', 'experiment', 'data', 
    'analysis', 'results', 'findings', 'publication', 'paper',
    'journal', 'conference', 'grant', 'funding', 'proposal',
    'hypothesis', 'theory', 'method', 'methodology', 'sample',
    'participant', 'subject', 'control', 'variable', 'condition',
    'treatment', 'effect', 'significance', 'correlation', 'causation',
    'academic', 'scholar', 'professor', 'student', 'university',
    'college', 'department', 'faculty', 'laboratory', 'institute'
  ];
  
  return academicContextPhrases.some(phrase => 
    context.toLowerCase().includes(phrase.toLowerCase())
  );
};

/**
 * Enhanced scam detection with more patterns and severity levels
 * @param text Text to check for scam patterns
 * @returns Detailed scam check results
 */
export function enhancedScamCheck(text: string): {
  detected: boolean;
  severity: 'high' | 'medium' | 'low';
  patterns: string[];
} {
  // Check if the text contains whitelisted phrases
  if (isWhitelisted(text)) {
    // Skip scam detection for whitelisted content
    return {
      detected: false,
      severity: 'low',
      patterns: []
    };
  }
  
  const highRiskPatterns = [
    // Existing patterns
    {
      pattern: /\b(double|triple|multiply)\s+your\s+(investment|money|tokens?|eth)\b/i,
      description: 'Promises of multiplying investments'
    },
    {
      pattern: /\b(send|transfer|deposit)\s+(eth|tokens?|coins?|funds?)\s+to\b/i,
      description: 'Requests for direct token transfers'
    },
    // New patterns
    {
      pattern: /\b(private|secret)\s+(key|seed|phrase|password)\b/i,
      description: 'Requests for private keys or seed phrases'
    },
    {
      pattern: /\b(validate|verify|confirm)\s+(wallet|account|holdings)\b/i,
      description: 'Suspicious wallet validation requests'
    },
    {
      pattern: /\b(connect|sync|restore)\s+(wallet|metamask|account)\b/i,
      description: 'Suspicious wallet connection requests'
    },
    {
      pattern: /\b(admin|owner|root)\s+(access|privilege|right|permission)\b/i,
      description: 'Requests for administrative access'
    }
  ];
  
  const mediumRiskPatterns = [
    // Existing patterns - REMOVED "High-pressure tactics" from here
    {
      pattern: /\b(private|secret|exclusive)\s+(sale|deal|offer|opportunity)\b/i,
      description: 'Claims of exclusive or private deals'
    },
    {
      pattern: /\b(bypass|circumvent|override)\s+(governance|voting|rules|security)\b/i,
      description: 'Attempts to bypass governance'
    },
    // New patterns
    {
      pattern: /\b(only|just)\s+[0-9]+\s+(spots?|places?|positions?)\s+(left|remaining|available)\b/i,
      description: 'Artificial scarcity tactics'
    },
    {
      pattern: /\b(whitelist|presale|pre-sale)\s+(spot|access|opportunity)\b/i,
      description: 'Suspicious presale tactics'
    },
    {
      pattern: /\b(upgrade|modify|change)\s+(contract|owner|admin|permission)\b/i,
      description: 'Suspicious contract modifications'
    }
  ];
  
  const lowRiskPatterns = [
    // Existing patterns
    {
      pattern: /\b(free|bonus|guaranteed|unlimited)\s+(tokens?|eth|money|cash|coins?)\b/i,
      description: 'Promises of free or guaranteed tokens/money'
    },
    {
      pattern: /\b(risk[- ]free|100%\s+safe|no\s+risk)\b/i,
      description: 'Unrealistic safety claims'
    },
    {
      pattern: /\b(airdrop|claim|reward)\s+(available|now|tokens?)\b/i,
      description: 'Suspicious token claims or airdrops'
    },
    // Modified pattern for urgency - moved from medium to low risk and refined to reduce false positives
    {
      // More specific pattern to avoid flagging legitimate academic/scientific urgency
      pattern: /\b(urgent|emergency)\s+(action|transfer|deposit|investment|opportunity)\b/i,
      description: 'High-pressure tactics or artificial urgency'
    },
    // Add a more relaxed pattern for "limited time" and "act now" phrases
    {
      pattern: /\b(limited\s+time|act\s+now|expires?\s+soon)\s+(offer|deal|investment|opportunity)\b/i,
      description: 'Time-limited offers'
    },
    // New patterns
    {
      pattern: /\b(join|participate|get\s+in)\s+(now|today|quickly)\b/i,
      description: 'Pressure to participate quickly'
    },
    {
      pattern: /\b(special|exclusive|limited)\s+(offer|deal|opportunity)\b/i,
      description: 'Claims of exclusive opportunities'
    }
  ];
  
  const detectedPatterns: string[] = [];
  let highestSeverity: 'high' | 'medium' | 'low' | null = null;
  
  // Check high risk patterns
  for (const {pattern, description} of highRiskPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Check if the match is in a whitelisted context
      const isInWhitelistedContext = matches.some(match => 
        isPatternInWhitelistedContext(text, match)
      );
      
      if (!isInWhitelistedContext) {
        detectedPatterns.push(description);
        highestSeverity = 'high';
      }
    }
  }
  
  // Check medium risk patterns if no high risk detected
  if (highestSeverity !== 'high') {
    for (const {pattern, description} of mediumRiskPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Check if the match is in a whitelisted context
        const isInWhitelistedContext = matches.some(match => 
          isPatternInWhitelistedContext(text, match)
        );
        
        if (!isInWhitelistedContext) {
          detectedPatterns.push(description);
          highestSeverity = 'medium';
        }
      }
    }
  }
  
  // Check low risk patterns if no higher risk detected
  if (!highestSeverity) {
    for (const {pattern, description} of lowRiskPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Check if the match is in a whitelisted context
        const isInWhitelistedContext = matches.some(match => 
          isPatternInWhitelistedContext(text, match)
        );
        
        if (!isInWhitelistedContext) {
          detectedPatterns.push(description);
          highestSeverity = 'low';
        }
      }
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    severity: highestSeverity || 'low',
    patterns: detectedPatterns
  };
}

// Add a whitelist for common academic/scientific terms that might trigger false positives
const isWhitelisted = (text: string): boolean => {
  const whitelistedPhrases = [
    // Academic/scientific urgency terms
    'urgent need for research',
    'urgent scientific question',
    'time-sensitive research',
    'limited time window',
    'critical research opportunity',
    'research emergency',
    'urgent scientific problem',
    'time-critical experiment',
    'limited experimental window',
    'urgent scientific challenge',
    'time-sensitive data',
    'urgent funding need',
    'limited grant opportunity',
    'time-sensitive proposal',
    'urgent scientific breakthrough',
    'limited research opportunity',
    'urgent scientific discovery',
    'time-sensitive scientific question',
    'urgent experimental results',
    'limited experimental resources'
  ];
  
  // Check if any whitelisted phrase is in the text
  return whitelistedPhrases.some(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}; 