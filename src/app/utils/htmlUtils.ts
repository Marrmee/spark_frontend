/**
 * Utility functions for handling HTML content
 */

/**
 * Parses HTML content for display, especially for title and summary sections
 * @param content The HTML content to parse
 * @returns Properly formatted HTML content
 */
export function parseHtmlContent(content: string): string {
  if (!content) return '';
  
  // Check if content is already HTML or contains HTML tags
  const containsHtmlTags = /<[a-z][\s\S]*>/i.test(content);
  
  // If it's not HTML, just return it as is
  if (!containsHtmlTags) return content;
  
  // If it contains HTML tags, return it as is
  return content;
}

/**
 * Cleans up HTML content by removing empty styles and ensuring proper rendering
 * @param content The HTML content to clean
 * @returns Cleaned HTML content
 */
export function cleanHtmlContent(content: string): string {
  if (!content) return '';
  
  // Replace empty style attributes
  let cleanedContent = content.replace(/style="\s*;\s*;\s*;?\s*"/g, '');
  cleanedContent = cleanedContent.replace(/style="\s*;\s*;?\s*"/g, '');
  cleanedContent = cleanedContent.replace(/style="\s*"/g, '');
  
  // Replace style attributes with multiple semicolons
  cleanedContent = cleanedContent.replace(/style="([^"]*);\s*;\s*;?\s*"/g, 'style="$1"');
  cleanedContent = cleanedContent.replace(/style="([^"]*);\s*;?\s*"/g, 'style="$1"');
  
  // Remove text-align: left as it's the default
  cleanedContent = cleanedContent.replace(/text-align:\s*left;?/g, '');
  
  // Clean up any resulting empty style attributes
  cleanedContent = cleanedContent.replace(/style="\s*"/g, '');
  
  return cleanedContent;
} 