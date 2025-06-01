import crypto from 'crypto';
import DOMPurify from 'dompurify';
import { getTextContentFromHtml } from './textUtils';
/**
 * Security utilities for the application
 * These functions help protect against common security vulnerabilities
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input The user input to sanitize
 * @returns The sanitized input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Remove apostrophe encoding to display them properly
    // .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/**
 * Enhanced sanitization function that combines multiple security checks
 * @param input User input to sanitize
 * @param options Configuration options for sanitization
 * @returns Sanitized input and validation results
 */
export async function enhancedSanitizeInput(
  input: string,
  options: {
    allowHtml?: boolean;
    allowUrls?: boolean;
    allowedDomains?: string[];
    maxLength?: number;
    checkForScams?: boolean;
  } = {}
): Promise<{
  sanitizedInput: string;
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  let sanitizedInput = input;

  // Check length - if HTML is allowed, we need to check the text content length
  if (options.maxLength) {
    // Always use getTextContentFromHtml to get accurate character count
    // This handles both HTML and plain text inputs correctly
    const contentLength = getTextContentFromHtml(input).length;

    if (contentLength > options.maxLength) {
      issues.push(
        `Input exceeds maximum length of ${options.maxLength} characters (currently: ${contentLength})`
      );
    }
  }

  // Basic sanitization
  if (!options.allowHtml) {
    sanitizedInput = sanitizeInput(sanitizedInput);
  } else if (typeof window !== 'undefined') {
    // Use DOMPurify for more advanced HTML sanitization
    try {
      // Configure DOMPurify to allow specific tags and attributes for rich text
      const purifyConfig = {
        ALLOWED_TAGS: [
          'p',
          'br',
          'b',
          'i',
          'em',
          'strong',
          'a',
          'ul',
          'ol',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'pre',
          'code',
          // Add table-related tags
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ],
        ALLOWED_ATTR: [
          'href',
          'target',
          'rel',
          'class',
          'style',
          // Add table-related attributes
          'colspan',
          'rowspan',
          'width',
          'height',
          'align',
          'valign',
          'border',
          'cellpadding',
          'cellspacing',
        ],
        FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
        ALLOW_UNKNOWN_PROTOCOLS: false,
      };

      // First strip out color styling, then sanitize
      const strippedHtml = stripColorStyling(sanitizedInput);
      sanitizedInput = DOMPurify.sanitize(strippedHtml, purifyConfig);
    } catch (error) {
      // Fallback to basic sanitization if DOMPurify is not available
      sanitizedInput = sanitizeInput(sanitizedInput);
      issues.push('HTML sanitization failed, falling back to plain text');
    }
  }

  // URL validation
  if (options.allowUrls) {
    try {
      const { validateUrls } = await import('./urlValidator');
      const urlValidation = await validateUrls(sanitizedInput);
      if (!urlValidation.isValid) {
        issues.push(urlValidation.error || 'Invalid URL detected');
      }
    } catch (error) {
      // If URL validation fails or is not available, add a generic issue
      issues.push('URL validation failed');
    }
  }

  // Scam detection
  if (options.checkForScams) {
    try {
      const { checkForScamPatterns } = await import('./securityChecks');
      const scamCheck = checkForScamPatterns(sanitizedInput);
      if (scamCheck.detected) {
        issues.push(`Potential scam detected: ${scamCheck.pattern}`);
      }
    } catch (error) {
      // If scam detection fails or is not available, log the error
      console.error('Scam detection failed:', error);
    }
  }

  return {
    sanitizedInput,
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validates a URL to ensure it's safe
 * @param url The URL to validate
 * @param allowedDomains Optional list of allowed domains
 * @returns True if the URL is safe, false otherwise
 */
export function isSafeUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    // If allowed domains are specified, check if the URL's domain is in the list
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.some(
        (domain) =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`)
      );
    }

    return true;
  } catch (error) {
    // Invalid URL
    return false;
  }
}

/**
 * Generates a secure random token
 * @param length The length of the token
 * @returns A secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined') {
    // Browser environment
    window.crypto.getRandomValues(array);
  } else {
    // Node.js environment
    crypto.randomFillSync(array);
  }

  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates a nonce to prevent replay attacks
 * @param nonce The nonce to validate
 * @param expectedNonce The expected nonce
 * @returns True if the nonce is valid, false otherwise
 */
export function validateNonce(nonce: string, expectedNonce: string): boolean {
  if (!nonce || !expectedNonce) return false;

  // Use constant-time comparison to prevent timing attacks
  let result = 0;
  const nonceLength = nonce.length;
  const expectedLength = expectedNonce.length;

  if (nonceLength !== expectedLength) return false;

  for (let i = 0; i < nonceLength; i++) {
    result |= nonce.charCodeAt(i) ^ expectedNonce.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generates a CSRF token for form protection
 * @returns A secure CSRF token
 */
export function generateCsrfToken(): string {
  return generateSecureToken(32);
}

/**
 * Validates a CSRF token
 * @param token The token to validate
 * @param expectedToken The expected token
 * @returns Whether the token is valid
 */
export function validateCsrfToken(
  token: string,
  expectedToken: string
): boolean {
  return validateNonce(token, expectedToken);
}

/**
 * Validates blockchain transaction parameters for security issues
 * @param transaction Transaction details to validate
 * @returns Validation result with potential security issues
 */
export function validateTransactionSecurity(transaction: {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
}): {
  isSecure: boolean;
  warnings: string[];
  criticalIssues: string[];
} {
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(transaction.to)) {
    criticalIssues.push('Invalid Ethereum address format');
  }

  // Check for unusually high gas limits
  if (transaction.gasLimit && BigInt(transaction.gasLimit) > BigInt(1000000)) {
    warnings.push('Unusually high gas limit specified');
  }

  // Check for suspicious contract interactions in transaction data
  if (transaction.data && transaction.data !== '0x') {
    // Check for known malicious function signatures
    const functionSignature = transaction.data.slice(0, 10);
    const suspiciousFunctions = [
      '0x095ea7b3', // approve with unlimited allowance
      '0x42842e0e', // safeTransferFrom
    ];

    if (suspiciousFunctions.includes(functionSignature)) {
      warnings.push('Transaction contains potentially risky function calls');
    }

    // Check for unlimited token approvals
    if (
      functionSignature === '0x095ea7b3' &&
      transaction.data.includes(
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    ) {
      criticalIssues.push('Transaction contains unlimited token approval');
    }
  }

  return {
    isSecure: criticalIssues.length === 0,
    warnings,
    criticalIssues,
  };
}

/**
 * Gets the current nonce from sessionStorage
 * Falls back to an empty string if not available
 */
export function getNonce(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('sw_nonce') || '';
}

/**
 * Strips out color styling from HTML content to allow text to inherit color from its parent
 * @param html HTML content to process
 * @returns HTML content with color styling removed
 */
export function stripColorStyling(html: string): string {
  if (!html) return '';

  if (typeof window !== 'undefined') {
    try {
      // Create a temporary DOM element
      const tempDiv = document.createElement('div');

      // Set the HTML content
      tempDiv.innerHTML = html;

      // Process all elements with style attributes
      const elementsWithStyle = tempDiv.querySelectorAll('[style]');
      elementsWithStyle.forEach((element) => {
        // Get the current style
        let style = element.getAttribute('style') || '';

        // Check if this is a table-related element
        const isTableElement =
          element.tagName === 'TABLE' ||
          element.tagName === 'TR' ||
          element.tagName === 'TD' ||
          element.tagName === 'TH' ||
          element.tagName === 'THEAD' ||
          element.tagName === 'TBODY';

        // Extract text-align value if it exists
        const textAlignMatch = style.match(/text-align\s*:\s*([^;]+)/);
        const textAlign = textAlignMatch ? textAlignMatch[1].trim() : null;

        if (isTableElement) {
          // For table elements, only remove text color but preserve structural styling
          style = style.replace(/color\s*:\s*[^;]+;?/gi, 'color: inherit;');
          style = style.replace(/background-color\s*:\s*[^;]+;?/gi, '');
          style = style.replace(/background\s*:\s*[#\w\(\),\s]+;?/gi, '');
        } else {
          // For non-table elements, remove all color-related declarations
          style = style.replace(/color\s*:\s*[^;]+;?/gi, '');
          style = style.replace(/background-color\s*:\s*[^;]+;?/gi, '');
          style = style.replace(/background\s*:\s*[#\w\(\),\s]+;?/gi, '');
          style = style.replace(/text-shadow\s*:[^;]+;?/gi, '');
          style = style.replace(/-webkit-text-fill-color\s*:[^;]+;?/gi, '');
          style = style.replace(/border-color\s*:[^;]+;?/gi, '');
          style = style.replace(/outline-color\s*:[^;]+;?/gi, '');
        }

        // Clean up any double semicolons and trailing semicolons
        style = style.replace(/;;+/g, ';').replace(/;+\s*$/, '');

        // Re-add text alignment if it existed
        if (textAlign) {
          style = style ? `${style}; text-align: ${textAlign}` : `text-align: ${textAlign}`;
        }

        // Set the updated style
        if (style) {
          element.setAttribute('style', style);
        } else {
          element.removeAttribute('style');
        }

        // Force color inheritance by adding a specific style
        if (element instanceof HTMLElement) {
          element.style.color = 'inherit';
        }
      });

      // Return the processed HTML
      return tempDiv.innerHTML;
    } catch (error) {
      console.error('Error stripping color styling:', error);
      return html; // Return original HTML if processing fails
    }
  }

  // For non-browser environments, return the original HTML
  return html;
}

/**
 * Converts consecutive empty paragraphs to hr elements
 * @param html HTML content to process
 * @returns Processed HTML with hr elements
 */
function convertEmptyParagraphsToHr(html: string): string {
  // Pattern to match two or more consecutive empty paragraphs
  const pattern = /(<p>\s*<\/p>\s*){2,}/g;
  return html.replace(pattern, '<hr class="proposal-hr" />');
}

/**
 * Prepares HTML content for display by applying CSS classes and sanitization
 * @param html HTML content to prepare
 * @returns Sanitized HTML content with appropriate CSS classes
 */
export function prepareHtmlForDisplay(html: string): string {
  if (!html) return '';

  // Check if the content appears to be HTML or plain text with HTML tags
  const containsHtmlTags = /<[a-z][\s\S]*>/i.test(html);

  if (typeof window !== 'undefined') {
    try {
      // First check if content contains HTML entities that need to be decoded
      if (
        html.includes('&lt;') ||
        html.includes('&gt;') ||
        html.includes('&quot;') ||
        html.includes('&#39;')
      ) {
        const tempDiv = document.createElement('div');
        tempDiv.textContent = html;
        html = tempDiv.textContent;
      }

      // If it doesn't contain HTML tags but appears to be raw HTML tags as text,
      // we need to first process it to be interpreted as actual HTML
      if (
        !containsHtmlTags &&
        (html.includes('<span') ||
          html.includes('<p') ||
          html.includes('<strong'))
      ) {
        html = html
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#96;/g, '`');
      }

      // Convert consecutive empty paragraphs to hr elements
      html = convertEmptyParagraphsToHr(html);

      // Preserve line breaks in plain text
      if (!containsHtmlTags && !html.includes('<p') && !html.includes('<div')) {
        html = html.replace(/\n\n+/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');
        html = `<p>${html}</p>`;
      }

      // Process the HTML to ensure proper formatting
      let processedHtml = html;

      // Detect and convert paragraph-based tables
      processedHtml = detectAndConvertParagraphTables(processedHtml);

      // Wrap tables in responsive container
      if (processedHtml.includes('<table')) {
        processedHtml = processedHtml.replace(
          /<table/g,
          '<div class="table-wrapper"><table'
        );
        processedHtml = processedHtml.replace(/<\/table>/g, '</table></div>');
      }

      // Configure DOMPurify
      const purifyConfig = {
        ALLOWED_TAGS: [
          'p',
          'br',
          'b',
          'i',
          'em',
          'strong',
          'a',
          'ul',
          'ol',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'pre',
          'code',
          'div',
          'table',
          'thead',
          'tbody',
          'tr',
          'td',
          'th',
          'img',
          'span',
          'hr'
        ],
        ALLOWED_ATTR: [
          'href',
          'target',
          'rel',
          'class',
          'src',
          'alt',
          'title',
          'colspan',
          'rowspan',
          'style'
        ],
        ADD_ATTR: ['target'],
      };

      // Add hook to ensure proper class names are added
      DOMPurify.addHook('afterSanitizeAttributes', function (node) {
        if (node instanceof HTMLElement) {
          // Add target="_blank" to external links
          if (
            node.tagName === 'A' &&
            node.hasAttribute('href') &&
            node.getAttribute('href')?.startsWith('http')
          ) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }

          // Extract text-align from style if it exists
          const style = node.getAttribute('style') || '';
          const textAlignMatch = style.match(/text-align\s*:\s*([^;]+)/);
          const textAlign = textAlignMatch ? textAlignMatch[1].trim() : null;

          // Remove all style attributes
          node.removeAttribute('style');

          // Re-add text alignment if it existed
          if (textAlign) {
            node.style.textAlign = textAlign;
          }

          // Add appropriate classes based on element type
          switch (node.tagName) {
            case 'TABLE':
              node.classList.add('proposal-table');
              break;
            case 'TH':
            case 'TD':
              node.classList.add('proposal-cell');
              break;
            case 'TR':
              node.classList.add('proposal-row');
              break;
            case 'UL':
              node.classList.add('proposal-list');
              break;
            case 'OL':
              node.classList.add('proposal-list', 'proposal-list-ordered');
              break;
            case 'LI':
              node.classList.add('proposal-list-item');
              break;
            case 'PRE':
            case 'CODE':
              node.classList.add('proposal-code');
              break;
            case 'BLOCKQUOTE':
              node.classList.add('proposal-blockquote');
              break;
            case 'IMG':
              node.classList.add('proposal-image');
              break;
          }
        }
      });

      // Sanitize the HTML
      const sanitizedHtml = DOMPurify.sanitize(processedHtml, purifyConfig);

      // Remove the hook
      DOMPurify.removeHook('afterSanitizeAttributes');

      return sanitizedHtml;
    } catch (error) {
      console.error('Error preparing HTML for display:', error);
      return html;
    }
  }

  return html;
}

/**
 * Processes content that might contain raw HTML tags displayed as text
 * This is particularly useful for title and summary sections that might display HTML tags as text
 * @param content The content to process
 * @returns Properly formatted HTML content
 */
export function processRawHtmlContent(content: string): string {
  if (!content) return '';

  // Check if content appears to be raw HTML tags displayed as text
  const hasRawHtmlTags =
    content.includes('<span') ||
    content.includes('<p') ||
    content.includes('<strong') ||
    content.includes('style=');

  const isAlreadyHtml =
    /<[a-z][\s\S]*>/i.test(content) &&
    content.includes('</') &&
    !content.includes('&lt;');

  // Special case for the format seen in the IPFS content
  const isSpecialFormat =
    content.includes('style="text-align: left;') ||
    content.includes('style="font-size: 24px;') ||
    content.includes('<p style="text-align: left;') ||
    content.includes('font-family: var(--font-acuminMedium)');

  if (typeof window !== 'undefined') {
    try {
      // Special handling for the format seen in the IPFS content
      if (isSpecialFormat || (hasRawHtmlTags && !isAlreadyHtml)) {
        // Create a temporary DOM element
        const tempDiv = document.createElement('div');

        // First try to decode any HTML entities
        let processedContent = content
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#96;/g, '`');

        // Preserve line breaks in plain text
        if (!isAlreadyHtml && !processedContent.includes('<p')) {
          processedContent = processedContent.replace(/\n\n+/g, '</p><p>');
          processedContent = processedContent.replace(/\n/g, '<br>');
          processedContent = `<p>${processedContent}</p>`;
        }

        // Set the content
        tempDiv.innerHTML = processedContent;

        // Process all elements with style attributes to ensure proper display
        const elementsWithStyle = tempDiv.querySelectorAll('[style]');
        elementsWithStyle.forEach((element) => {
          // Get the current style
          let style = element.getAttribute('style') || '';

          // Normalize font-family
          style = style.replace(/font-family:[^;"]*/g, 'font-family: inherit');

          // Normalize color
          style = style.replace(/color:[^;"]*/g, 'color: inherit');

          // Set the updated style
          element.setAttribute('style', style);
        });

        // Return the processed HTML
        return tempDiv.innerHTML;
      }

      // For regular HTML content, just return it as is
      return content;
    } catch (error) {
      console.error('Error processing raw HTML content:', error);
      return content; // Return original content if processing fails
    }
  }

  // For non-browser environments, return the original content
  return content;
}

/**
 * Detects paragraph patterns that look like tables and converts them to proper HTML tables
 * This is particularly useful for content pasted from Google Docs or Word
 * @param html HTML content that might contain paragraph-based tables
 * @returns HTML content with paragraph-based tables converted to proper HTML tables
 */
export function detectAndConvertParagraphTables(html: string): string {
  if (!html || typeof html !== 'string') return html;

  if (typeof window === 'undefined') return html;

  try {
    // Create a temporary DOM element to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Look for all headings in the document
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

    // Process each heading and the content that follows it
    headings.forEach((heading) => {
      
      // Skip if this heading doesn't have content after it
      if (!heading.nextElementSibling) return;

      // Collect paragraphs after this heading until the next heading
      const paragraphsAfterHeading: Element[] = [];
      let currentElement: Element | null = heading.nextElementSibling;

      while (currentElement && !currentElement.tagName.match(/^H[1-6]$/)) {
        if (currentElement.tagName === 'P') {
          paragraphsAfterHeading.push(currentElement);
        }
        currentElement = currentElement.nextElementSibling;
      }

      // Skip if we don't have enough paragraphs to form a table
      if (paragraphsAfterHeading.length < 3) return;

      // Analyze the paragraphs to determine if they form a table-like structure
      const tableData = analyzeTableStructure(paragraphsAfterHeading);

      // If we detected a table structure, convert it
      if (tableData.isTable) {
        // Create a table from the detected rows
        const tableHtml = createTableFromRows(
          tableData.rows,
          tableData.hasNumericColumn
        );

        // Create a container for the table
        const tableContainer = document.createElement('div');
        tableContainer.innerHTML = tableHtml;

        // Insert the table after the heading
        const firstChild = tableContainer.firstChild;
        if (heading.parentNode && firstChild) {
          heading.parentNode.insertBefore(
            firstChild,
            heading.nextElementSibling
          );

          // Remove the paragraphs that were converted to a table
          paragraphsAfterHeading.forEach((p) => {
            if (p.parentNode) {
              p.parentNode.removeChild(p);
            }
          });
        }
      }
    });

    return tempDiv.innerHTML;
  } catch (error) {
    console.error('Error in detectAndConvertParagraphTables:', error);
    return html;
  }
}

/**
 * Analyzes a sequence of paragraphs to determine if they form a table-like structure
 * @param paragraphs Array of paragraph elements to analyze
 * @returns Object with table detection results
 */
function analyzeTableStructure(paragraphs: Element[]): {
  isTable: boolean;
  rows: string[][];
  hasNumericColumn: boolean;
} {
  // Default result
  const result = {
    isTable: false,
    rows: [] as string[][],
    hasNumericColumn: false,
  };

  // Skip if we don't have enough paragraphs
  if (paragraphs.length < 3) return result;

  // Check for common table patterns

  // Pattern 1: Alternating label/value pairs
  // Example: "Item: Value", "Another Item: Another Value"
  let colonSeparatedCount = 0;
  let dollarSignCount = 0;
  let numberCount = 0;

  // Count paragraphs with specific patterns
  paragraphs.forEach((p) => {
    const text = p.textContent || '';
    if (text.includes(':')) colonSeparatedCount++;
    if (text.includes('$')) dollarSignCount++;
    if (/\d+/.test(text)) numberCount++;
  });

  // If most paragraphs have colons, it's likely a table
  const hasColonPattern = colonSeparatedCount >= paragraphs.length * 0.7;

  // If many paragraphs have dollar signs or numbers, it might be a budget table
  const hasBudgetPattern =
    dollarSignCount >= paragraphs.length * 0.3 ||
    (numberCount >= paragraphs.length * 0.5 && colonSeparatedCount > 0);

  // Pattern 2: Milestone/timeline pattern
  // Example: "M1: Description - Week 2"
  let milestoneCount = 0;
  let weekCount = 0;

  paragraphs.forEach((p) => {
    const text = p.textContent || '';
    if (/M\d+:/.test(text) || text.toLowerCase().includes('milestone'))
      milestoneCount++;
    if (
      text.toLowerCase().includes('week') ||
      text.toLowerCase().includes('month') ||
      /\d+\s*-\s*\d+/.test(text)
    )
      weekCount++;
  });

  const hasTimelinePattern =
    milestoneCount >= 2 || (milestoneCount >= 1 && weekCount >= 2);

  // Determine if we have a table structure
  if (hasColonPattern || hasBudgetPattern || hasTimelinePattern) {
    result.isTable = true;
    result.hasNumericColumn = hasBudgetPattern;

    // Create table rows based on the detected pattern
    if (hasColonPattern || hasBudgetPattern) {
      // For budget or key-value tables

      // Add header row
      result.rows.push(['Item', 'Description', 'Value']);

      // Process paragraphs to extract rows
      paragraphs.forEach((p) => {
        const text = p.textContent || '';
        if (!text.trim()) return; // Skip empty paragraphs

        // Try to parse as "Key: Description - Value" format
        const keyValueMatch = text.match(
          /([^:]+):\s*([^-$]+)(?:\s*-\s*)?(?:\$?(\d[\d,.]*))?/
        );

        if (keyValueMatch) {
          result.rows.push([
            keyValueMatch[1].trim(),
            keyValueMatch[2].trim(),
            keyValueMatch[3] ? '$' + keyValueMatch[3].trim() : '',
          ]);
        } else if (text.includes(':')) {
          // Simpler "Key: Value" format
          const parts = text.split(':');
          result.rows.push([
            parts[0].trim(),
            parts.slice(1).join(':').trim(),
            '',
          ]);
        } else if (text.includes('$')) {
          // Format with dollar sign
          const parts = text.split('$');
          result.rows.push([parts[0].trim(), '', '$' + parts[1].trim()]);
        }
      });
    } else if (hasTimelinePattern) {
      // For timeline tables

      // Add header row
      result.rows.push(['Milestone', 'Description', 'Timeline']);

      // Process paragraphs to extract rows
      paragraphs.forEach((p) => {
        const text = p.textContent || '';
        if (!text.trim()) return; // Skip empty paragraphs

        // Try to parse as "M1: Description - Week X" format
        const milestoneMatch = text.match(
          /M(\d+):\s*([^-]+)(?:\s*-\s*)?(.+)?/i
        );

        if (milestoneMatch) {
          result.rows.push([
            'M' + milestoneMatch[1].trim(),
            milestoneMatch[2].trim(),
            milestoneMatch[3] ? milestoneMatch[3].trim() : '',
          ]);
        } else if (
          text.toLowerCase().includes('milestone') ||
          text.toLowerCase().includes('week')
        ) {
          // Try to extract milestone information
          const parts = text.split(/[-:]/);
          if (parts.length >= 2) {
            result.rows.push([
              parts[0].trim(),
              parts[1].trim(),
              parts.length > 2 ? parts[2].trim() : '',
            ]);
          }
        }
      });
    }

    // If we couldn't extract structured rows, create a simple two-column table
    if (result.rows.length <= 1) {
      result.rows = [['Item', 'Value']];
      paragraphs.forEach((p) => {
        const text = p.textContent || '';
        if (!text.trim()) return; // Skip empty paragraphs

        if (text.includes(':')) {
          const parts = text.split(':');
          result.rows.push([parts[0].trim(), parts.slice(1).join(':').trim()]);
        } else {
          result.rows.push([text, '']);
        }
      });
    }
  }

  return result;
}

/**
 * Creates an HTML table from an array of rows
 * @param rows Array of rows, where each row is an array of cell HTML content
 * @param isBudgetTable Whether this is a budget table (for special styling)
 * @returns HTML string representing a table
 */
function createTableFromRows(
  rows: string[][],
  isBudgetTable: boolean = false
): string {
  if (!rows || rows.length === 0) return '';

  // Determine the maximum number of columns
  const maxColumns = Math.max(...rows.map((row) => row.length));

  // Create the table HTML with improved styling and transparent background
  let tableHTML =
    '<div style="overflow-x:auto;max-width:100%;margin:1.5rem 0;">';
  tableHTML +=
    '<table style="border-collapse:collapse;width:100%;margin:0;border:1px solid rgba(255,255,255,0.2);font-family:var(--font-acuminMedium),sans-serif;background:transparent;display:table !important;table-layout:auto !important;">';

  // Add the header row
  tableHTML +=
    '<thead style="display:table-header-group !important;"><tr style="display:table-row !important;">';
  for (let i = 0; i < maxColumns; i++) {
    if (rows[0] && rows[0][i]) {
      tableHTML += `<th style="border:1px solid rgba(255,255,255,0.2);padding:0.75rem;color:white;text-align:left;background-color:rgba(255,255,255,0.1);font-weight:bold;display:table-cell !important;min-width:100px;">${rows[0][i]}</th>`;
    } else {
      tableHTML +=
        '<th style="border:1px solid rgba(255,255,255,0.2);padding:0.75rem;color:white;text-align:left;background-color:rgba(255,255,255,0.1);font-weight:bold;display:table-cell !important;min-width:100px;"></th>';
    }
  }
  tableHTML += '</tr></thead>';

  // Add the body rows
  tableHTML += '<tbody style="display:table-row-group !important;">';
  for (let i = 1; i < rows.length; i++) {
    // Use transparent background with subtle zebra striping
    const rowStyle =
      i % 2 === 1
        ? ' style="background-color:rgba(255,255,255,0.05);display:table-row !important;"'
        : ' style="background-color:transparent;display:table-row !important;"';

    tableHTML += `<tr${rowStyle}>`;

    for (let j = 0; j < maxColumns; j++) {
      // Check if this cell might contain a currency value
      let cellStyle =
        'border:1px solid rgba(255,255,255,0.2);padding:0.75rem;color:white;background:transparent;display:table-cell !important;min-width:100px;';

      // If this is a budget table and the last column, it's likely a value column
      // so we'll right-align it for better appearance
      if (isBudgetTable && j === maxColumns - 1) {
        cellStyle += 'text-align:right;';
      } else {
        cellStyle += 'text-align:left;';
      }

      if (rows[i] && rows[i][j]) {
        // Check if the content looks like a currency value
        const cellContent = rows[i][j];
        const textContent = cellContent.replace(/<[^>]*>/g, '').trim();

        if (
          textContent.includes('$') ||
          /^\d+,\d+$/.test(textContent) ||
          /^\d+\.\d+$/.test(textContent) ||
          /^\$\d+,\d+$/.test(textContent) ||
          /^\$\d+$/.test(textContent)
        ) {
          // This is likely a currency value, so right-align it
          cellStyle =
            'border:1px solid rgba(255,255,255,0.2);padding:0.75rem;color:white;text-align:right;font-weight:bold;background:transparent;';
        }

        // Special handling for the "Total" row
        if (textContent.toLowerCase() === 'total') {
          cellStyle += 'font-weight:bold;';
        }

        tableHTML += `<td style="${cellStyle}">${cellContent}</td>`;
      } else {
        tableHTML += `<td style="${cellStyle}"></td>`;
      }
    }

    tableHTML += '</tr>';
  }
  tableHTML += '</tbody></table></div>';

  return tableHTML;
}
