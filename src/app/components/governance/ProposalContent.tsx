import React, { useEffect, useState } from 'react';
import './proposal-content.css';
import {
  prepareHtmlForDisplay,
  processRawHtmlContent,
} from '@/app/utils/securityUtils';
import { processGoogleDocsHtml } from '@/app/utils/googleDocsProcessor';
import DOMPurify from 'dompurify';

interface ProposalContentProps {
  content: string;
  type: 'title' | 'summary' | 'body';
  className?: string;
}

/**
 * Extracts plain text from HTML content
 * @param html HTML content to extract text from
 * @returns Plain text without HTML tags
 */
const extractTextFromHtml = (html: string): string => {
  if (!html) return '';

  if (typeof window !== 'undefined') {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || '';
    } catch (error) {
      console.error('Error extracting text from HTML:', error);
      return html
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#96;/g, '`')
        .trim();
    }
  }

  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#96;/g, '`')
    .trim();
};

const ProposalContent: React.FC<ProposalContentProps> = ({
  content,
  type,
  className = '',
}) => {
  const [processedContent, setProcessedContent] = useState<string>('');

  useEffect(() => {
    if (!content) {
      setProcessedContent('');
      return;
    }

    if (typeof window !== 'undefined') {
      let processed;

      if (type === 'title') {
        const plainText = extractTextFromHtml(content);
        processed = `<div>${plainText}</div>`;
      } else {
        processed = processRawHtmlContent(content);
        processed = processGoogleDocsHtml(processed);

        if (type === 'summary' || type === 'body') {
          const purifyConfig = {
            ALLOWED_TAGS: [
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'blockquote', 'p', 'a', 'ul', 'ol',
              'nl', 'li', 'b', 'i', 'u', 'strong',
              'em', 'strike', 'code', 'hr', 'br',
              'div', 'table', 'thead', 'caption',
              'tbody', 'tr', 'th', 'td', 'pre',
              'img', 'span'
            ],
            ALLOWED_ATTR: [
              'href',
              'name',
              'target',
              'src',
              'class',
              'id',
              'data-*',
              'colspan',
              'rowspan',
              'style'
            ],
            KEEP_CONTENT: true,
            ALLOW_DATA_ATTR: true,
          };

          processed = DOMPurify.sanitize(processed, purifyConfig);
        }

        processed = prepareHtmlForDisplay(processed);
      }

      setProcessedContent(processed);
    }
  }, [content, type]);

  const baseClassName = 'proposal-content';
  const typeClassName = `proposal-${type}`;
  const combinedClassName = `${baseClassName} ${typeClassName} ${className}`.trim();

  return (
    <div
      className={combinedClassName}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
};

export default ProposalContent;
