export async function checkGrammar(text: string): Promise<{ isValid: boolean; error: string }> {
  try {
    // Skip empty text
    if (!text || text.trim().length === 0) {
      return { isValid: true, error: '' };
    }

    // Basic client-side checks first
    const basicChecks = performBasicChecks(text);
    if (!basicChecks.isValid) {
      return basicChecks;
    }

    // Due to CSP restrictions, we'll skip the external API call and rely on basic checks
    return { isValid: true, error: '' };
  } catch (error) {
    console.error('Error checking grammar:', error);
    return { isValid: true, error: '' }; // Fail open on errors
  }
}

function performBasicChecks(text: string): { isValid: boolean; error: string } {
  // Check for minimum length
  if (text.length < 3) {
    return { isValid: false, error: 'Text is too short' };
  }

  // Check for basic sentence structure - only require capital letter at start
  if (!text.match(/^[A-Z]/)) {
    return { isValid: false, error: 'Text should start with a capital letter' };
  }

  // Check for excessive punctuation
  if (text.match(/[!?.]{3,}/)) {
    return { isValid: false, error: 'Excessive punctuation detected' };
  }

  // Check for repeated words
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    if (words[i].length > 3 && words[i] === words[i - 1]) {
      return { isValid: false, error: 'Repeated words detected' };
    }
  }

  // Check for minimum word count in longer texts
  if (text.length > 50 && words.length < 3) {
    return { isValid: false, error: 'Text should contain more words' };
  }

  // Check for balanced parentheses and quotes
  const balanced = checkBalancedCharacters(text);
  if (!balanced.isValid) {
    return balanced;
  }

  return { isValid: true, error: '' };
}

function checkBalancedCharacters(text: string): { isValid: boolean; error: string } {
  const stack: string[] = [];
  const pairs: { [key: string]: string } = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"'
  };

  // Pre-process text to handle apostrophes in common contractions and possessive forms
  const commonContractions = ["'s", "'t", "'re", "'ll", "'ve", "'m", "'d"];
  let processedText = text;
  
  // Skip apostrophe checks for common contractions and possessive forms
  for (const contraction of commonContractions) {
    processedText = processedText.replace(new RegExp(contraction, 'g'), '');
  }

  for (const char of processedText) {
    // Only check for brackets and quotes, not apostrophes
    if ('([{"'.includes(char)) {
      stack.push(char);
    } else if (')]}"'.includes(char)) {
      const last = stack.pop();
      if (!last || pairs[last] !== char) {
        return { isValid: false, error: 'Unmatched brackets or quotes' };
      }
    }
  }

  if (stack.length > 0) {
    return { isValid: false, error: 'Unclosed brackets or quotes' };
  }

  return { isValid: true, error: '' };
} 