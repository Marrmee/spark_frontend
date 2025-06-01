/**
 * Extracts plain text content from HTML by removing all HTML tags
 * Used for character counting and validation
 */
export const getTextContentFromHtml = (html: string): string => {
  if (!html) return '';
  
  // Handle browser environment
  if (typeof document !== 'undefined') {
    try {
      // Create a temporary DOM element
      const tempDiv = document.createElement('div');
      
      // Set the HTML content directly
      tempDiv.innerHTML = html;
      
      // Get the text content (this handles HTML entities correctly)
      let textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // Add spaces at word boundaries in cases like "BackgroundConcept" or "BioChem2.1"
      textContent = textContent
        // Add space between lowercase to uppercase transitions (camelCase)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Add space between numbers and letters
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2');
      
      // Normalize whitespace: replace multiple spaces with a single space
      textContent = textContent
        .replace(/\s+/g, ' ')
        .trim();
      
      return textContent;
    } catch (error) {
      console.error('Error extracting text from HTML:', error);
      // Fallback to enhanced regex approach if DOM parsing fails
      return enhancedHtmlToText(html);
    }
  }
  
  // Fallback for non-browser environments
  return enhancedHtmlToText(html);
};

/**
 * Enhanced HTML to text conversion for non-browser environments
 * or as fallback when DOM parsing fails
 */
const enhancedHtmlToText = (html: string): string => {
  // Step 1: Decode common HTML entities
  let text = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Step 2: Add spaces after block-level elements
  text = text
    .replace(/<\/(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|tr|th|td)>/gi, '</$1> ')
    .replace(/<br\s*\/?>/gi, '\n');
  
  // Step 3: Remove all HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Step 4: Format the text for readability - add spaces at word boundaries
  text = text
    // Add space between lowercase to uppercase transitions (camelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Add space between numbers and letters
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2');
  
  // Step 5: Normalize whitespace
  text = text
    .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
    .trim();
  
  return text;
};

/**
 * Calculates the character count of text, handling HTML content if needed
 */
export const calculateCharacterCount = (
  text: string,
  isHtml: boolean = false
): number => {
  if (!text) return 0;
  
  if (isHtml) {
    // Simply extract the plain text and count those characters
    const plainText = getTextContentFromHtml(text);
    return plainText.length;
  }
  
  // For plain text, just return the length
  return text.length;
}; 