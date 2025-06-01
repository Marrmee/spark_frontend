/**
 * Utility functions for processing Google Docs HTML content
 * Focuses on properly handling tables and other structured content
 */

/**
 * Process HTML content pasted from Google Docs
 * @param html The HTML content from clipboard
 * @returns Processed HTML with proper table structure and styling
 */
export function processGoogleDocsHtml(html: string): string {
  // Skip processing if not from Google Docs
  if (!isGoogleDocsContent(html)) {
    return html;
  }

  console.debug('Processing Google Docs HTML content');
  
  try {
    // Fix common character spacing issues with Google Docs
    html = fixCharacterSpacing(html);
    
    // Fix spacing between bold and regular text
    html = fixBoldTextSpacing(html);
    
    // Create a DOM parser to work with the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Process Google Docs horizontal rules
    // This needs to happen before other processing as it affects paragraph structure
    processGoogleDocsHorizontalRules(doc);
    
    // Process tables
    processGoogleDocsTables(doc);
    
    // Process lists
    processGoogleDocsLists(doc);
    
    // Process paragraphs that might represent tables
    detectTableStructureInParagraphs(doc);
    
    // Process formatting (bold, italic, etc.)
    preserveTextFormatting(doc);
    
    // Process headings
    processHeadings(doc);
    
    // Process Google Docs specific styles
    processGoogleDocsStyles(doc);
    
    // Detect and preserve text alignment
    preserveTextAlignment(doc);
    
    // Cleanup problematic spans that cause character spacing issues
    fixSpans(doc);
    
    // Return the processed HTML
    return doc.body.innerHTML;
  } catch (error) {
    console.error('Error processing Google Docs HTML:', error);
    // Return the original HTML if processing fails
    return html;
  }
}

/**
 * Fix character spacing issues in Google Docs HTML
 * @param html The HTML content
 * @returns HTML with fixed character spacing
 */
function fixCharacterSpacing(html: string): string {
  // Fix issues with zero-width spaces causing text to be scattered
  html = html.replace(/\u200B/g, '');
  
  // Fix consecutive spans with style (BUT preserve the styles)
  html = html.replace(/<\/span><span style="([^"]+)">/gi, '<span style="$1">');
  
  // Fix issues with non-breaking spaces being used excessively
  // But keep some to preserve text structure
  html = html.replace(/(&nbsp;){2,}/g, ' &nbsp; ');
  
  // Fix issues with paragraph breaks
  html = html.replace(/<p>\s*<\/p>/gi, '<p>&nbsp;</p>');
  
  // Don't normalize all whitespace as it can break text layout
  // Only normalize multiple spaces (not including newlines or tabs)
  html = html.replace(/ {2,}/g, ' ');
  
  return html;
}

/**
 * Fix span elements that cause character spacing issues
 * @param doc The HTML document to process
 */
function fixSpans(doc: Document): void {
  // Get all spans in the document
  const spans = doc.querySelectorAll('span');
  
  // Check for spans with only one character that may be causing spacing issues
  spans.forEach(span => {
    // If span contains only one character or is empty, we need to fix it
    if (span.textContent && span.textContent.length <= 1) {
      // If it has a next sibling that is also a span, merge them
      // but PRESERVE styling attributes
      if (span.nextSibling && span.nextSibling.nodeName === 'SPAN') {
        const nextSpan = span.nextSibling as HTMLElement;
        
        // Only merge text content, keep both spans to preserve styling
        const nextContent = nextSpan.textContent || '';
        if (nextContent && span.textContent) {
          span.textContent += nextContent;
          nextSpan.textContent = '';
        }
      }
    }
    
    // Modify only problematic styling that causes layout issues
    // but PRESERVE styling that affects text appearance
    const style = span.getAttribute('style');
    if (style) {
      // Keep formatting styles (font-weight, font-style, etc.)
      // Only remove layout-breaking styles
      const safeStyle = style
        .replace(/position:\s*absolute;?/gi, '')
        .replace(/display:\s*none;?/gi, '') // Only remove display:none
        .replace(/width:\s*0px;?/gi, '')    // Only remove zero width
        .replace(/height:\s*0px;?/gi, '')   // Only remove zero height
        .replace(/overflow:\s*hidden;?/gi, '')
        .replace(/visibility:\s*hidden;?/gi, '')
        .replace(/opacity:\s*0;?/gi, '');   // Only remove zero opacity
      
      span.setAttribute('style', safeStyle);
    }
  });
  
  // Preserve text nodes but fix adjacent ones
  const textNodes = Array.from(doc.body.childNodes).filter(
    node => node.nodeType === Node.TEXT_NODE
  );
  
  textNodes.forEach(textNode => {
    if (textNode.nextSibling && textNode.nextSibling.nodeType === Node.TEXT_NODE) {
      // Handle possible null values for textContent
      const currentContent = textNode.textContent || '';
      const nextContent = textNode.nextSibling.textContent || '';
      textNode.textContent = currentContent + nextContent;
      textNode.nextSibling.textContent = '';
    }
  });
}

/**
 * Check if the HTML content is from Google Docs
 * @param html The HTML content to check
 * @returns True if the content appears to be from Google Docs
 */
function isGoogleDocsContent(html: string): boolean {
  return html.includes('docs-internal-guid') || 
         html.includes('google-docs') || 
         html.includes('googleDocsMarker');
}

/**
 * Process Google Docs tables to ensure proper HTML structure
 * @param doc The HTML document to process
 */
function processGoogleDocsTables(doc: Document): void {
  // Google Docs tables often have specific class names or structures
  // Look for tables or table-like structures
  
  // First, look for actual table elements
  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    // Ensure the table has proper structure
    ensureTableStructure(table);
    
    // Apply our application's styling
    applyTableStyling(table);
    
    // Add the google-docs-table class for consistent styling
    table.classList.add('google-docs-table');
  });
  
  // Look for Google Docs specific table structures
  // These might be divs with specific classes that represent tables
  const googleDocsTables = doc.querySelectorAll('div[class*="table"], div[style*="table"], div[style*="display: grid"]');
  googleDocsTables.forEach(tableDiv => {
    // Convert to proper HTML table
    convertDivToTable(tableDiv);
  });
  
  // Look for special cases of div grids that might be tables
  detectGridLayoutTables(doc);
}

/**
 * Ensure a table has proper structure (thead, tbody, etc.)
 * @param table The table element to process
 */
function ensureTableStructure(table: HTMLTableElement): void {
  // Check if the table has a thead
  if (!table.querySelector('thead')) {
    // If the first row looks like a header row, move it to a thead
    const firstRow = table.querySelector('tr');
    if (firstRow && firstRow.querySelectorAll('th').length > 0) {
      const thead = document.createElement('thead');
      thead.appendChild(firstRow.cloneNode(true));
      table.insertBefore(thead, table.firstChild);
      firstRow.remove();
    } else if (firstRow) {
      // Convert the first row to a header row
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      // Convert td to th for each cell in the first row
      firstRow.querySelectorAll('td').forEach(cell => {
        const th = document.createElement('th');
        th.innerHTML = cell.innerHTML;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.insertBefore(thead, table.firstChild);
      firstRow.remove();
    }
  }
  
  // Ensure all rows are in a tbody if not in thead
  if (!table.querySelector('tbody')) {
    const tbody = document.createElement('tbody');
    Array.from(table.querySelectorAll('tr')).forEach(row => {
      if (!row.parentElement || row.parentElement.tagName !== 'THEAD') {
        tbody.appendChild(row.cloneNode(true));
        row.remove();
      }
    });
    table.appendChild(tbody);
  }
}

/**
 * Convert a div that represents a table to a proper HTML table
 * @param tableDiv The div element to convert
 */
function convertDivToTable(tableDiv: Element): void {
  // Create a new table element
  const table = document.createElement('table');
  
  // Find rows (usually divs with specific classes or styles)
  const rowDivs = tableDiv.querySelectorAll('div[class*="row"], div[style*="display: table-row"]');
  
  // If no explicit rows found, try to infer rows from the structure
  if (rowDivs.length === 0) {
    // Try to infer rows based on child divs
    const childDivs = tableDiv.querySelectorAll(':scope > div');
    if (childDivs.length > 0) {
      // Create thead and tbody
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      
      // First div is likely the header
      const headerRow = document.createElement('tr');
      const headerCells = childDivs[0].querySelectorAll('div, span, p');
      headerCells.forEach(cell => {
        const th = document.createElement('th');
        th.innerHTML = cell.innerHTML;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      
      // Remaining divs are likely data rows
      for (let i = 1; i < childDivs.length; i++) {
        const row = document.createElement('tr');
        const cells = childDivs[i].querySelectorAll('div, span, p');
        cells.forEach(cell => {
          const td = document.createElement('td');
          td.innerHTML = cell.innerHTML;
          row.appendChild(td);
        });
        tbody.appendChild(row);
      }
      
      table.appendChild(thead);
      table.appendChild(tbody);
    }
  } else {
    // Process explicit rows
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    rowDivs.forEach((rowDiv, rowIndex) => {
      const row = document.createElement('tr');
      
      // Find cells (usually divs with specific classes or styles)
      const cellDivs = rowDiv.querySelectorAll('div[class*="cell"], div[style*="display: table-cell"], span, p');
      
      cellDivs.forEach(cellDiv => {
        if (rowIndex === 0) {
          // First row is likely the header
          const th = document.createElement('th');
          th.innerHTML = cellDiv.innerHTML;
          row.appendChild(th);
        } else {
          const td = document.createElement('td');
          td.innerHTML = cellDiv.innerHTML;
          row.appendChild(td);
        }
      });
      
      if (rowIndex === 0) {
        thead.appendChild(row);
      } else {
        tbody.appendChild(row);
      }
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
  }
  
  // Apply styling
  applyTableStyling(table);
  
  // Replace the div with the table
  tableDiv.parentNode?.replaceChild(table, tableDiv);
}

/**
 * Detect grid layouts that might actually be tables
 * @param doc The HTML document to process
 */
function detectGridLayoutTables(doc: Document): void {
  // Google Docs sometimes uses grid layouts for tables
  // Look for grid containers
  const gridContainers = doc.querySelectorAll('div[style*="grid-template"], div[style*="display: grid"]');
  
  gridContainers.forEach(container => {
    // Check if this looks like a table
    const gridItems = container.querySelectorAll('div[style*="grid-area"], div[style*="grid-column"], div[style*="grid-row"]');
    
    if (gridItems.length > 3) { // Minimum cells for a table
      // Create a new table
      const table = document.createElement('table');
      table.classList.add('google-docs-table');
      table.style.borderCollapse = 'collapse';
      table.style.width = '100%';
      
      // Try to determine rows and columns from grid areas
      const cells = new Map();
      let maxRow = 0;
      let maxCol = 0;
      
      // Extract row and column information from grid items
      gridItems.forEach(item => {
        const style = (item as HTMLElement).style;
        
        // Try to extract grid position from various attributes
        let row = 1, col = 1;
        
        // From grid-area syntax
        if (style.gridArea) {
          const match = style.gridArea.match(/(\d+)/g);
          if (match && match.length >= 2) {
            row = parseInt(match[0]);
            col = parseInt(match[1]);
          }
        }
        
        // From grid-row and grid-column
        if (style.gridRow) {
          const match = style.gridRow.match(/(\d+)/);
          if (match) row = parseInt(match[1]);
        }
        
        if (style.gridColumn) {
          const match = style.gridColumn.match(/(\d+)/);
          if (match) col = parseInt(match[1]);
        }
        
        // Use data attribute as fallback
        if (row === 1 && col === 1) {
          row = parseInt(item.getAttribute('data-row') || '1');
          col = parseInt(item.getAttribute('data-col') || '1');
        }
        
        // Update max dimensions
        maxRow = Math.max(maxRow, row);
        maxCol = Math.max(maxCol, col);
        
        // Store cell content by position
        cells.set(`${row}-${col}`, item.innerHTML);
      });
      
      // Create table rows and cells
      const tbody = document.createElement('tbody');
      
      for (let r = 1; r <= maxRow; r++) {
        const tr = document.createElement('tr');
        
        for (let c = 1; c <= maxCol; c++) {
          const td = document.createElement('td');
          const content = cells.get(`${r}-${c}`) || '';
          td.innerHTML = content;
          td.style.border = '1px solid #ddd';
          td.style.padding = '8px';
          
          tr.appendChild(td);
        }
        
        tbody.appendChild(tr);
      }
      
      table.appendChild(tbody);
      
      // Replace the grid container with the table
      container.parentNode?.replaceChild(table, container);
    }
  });
}

/**
 * Apply consistent styling to tables
 * @param table The table element to style
 */
function applyTableStyling(table: HTMLTableElement): void {
  // Add consistent styling
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  table.style.marginBottom = '1rem';
  table.style.border = '1px solid #ddd';
  
  // Add class for external styling
  table.classList.add('google-docs-table');
  
  // Style cells
  const cells = table.querySelectorAll('td, th');
  cells.forEach(cell => {
    const cellElement = cell as HTMLElement;
    cellElement.style.border = '1px solid #ddd';
    cellElement.style.padding = '8px';
    
    // Ensure minimum width for readability
    if (!cellElement.style.minWidth) {
      cellElement.style.minWidth = '50px';
    }
    
    // Fix text alignment in cells
    if (!cellElement.style.textAlign) {
      // Try to infer alignment from cell content
      // Default to left if uncertain
      cellElement.style.textAlign = 'left';
    }
    
    // Remove any problematic styles that might break layout
    if (cellElement.style.position === 'absolute') {
      cellElement.style.position = 'static';
    }
    
    // Fix common issues with cell content
    fixCellContent(cellElement);
  });
  
  // Make header row distinguishable
  const headerRow = table.querySelector('tr:first-child');
  if (headerRow) {
    const headerCells = headerRow.querySelectorAll('td, th');
    headerCells.forEach(cell => {
      const cellElement = cell as HTMLElement;
      cellElement.style.fontWeight = 'bold';
      cellElement.style.backgroundColor = '#f9f9f9';
    });
  }
}

/**
 * Fix common issues with cell content
 * @param cell The cell element to fix
 */
function fixCellContent(cell: HTMLElement): void {
  // Fix nested divs that should be paragraphs
  const childDivs = cell.querySelectorAll(':scope > div');
  if (childDivs.length === 1) {
    // If there's only one div with just text content, replace it with its content
    const div = childDivs[0];
    if (div.querySelector('div, p, h1, h2, h3, h4, h5, h6, table') === null) {
      // Create text content from div
      const textContent = div.innerHTML;
      div.remove();
      cell.innerHTML = textContent;
    }
  }
  
  // Fix line breaks
  const brElements = cell.querySelectorAll('br');
  if (brElements.length > 0) {
    // If we have multiple br tags without other content, clean them up
    const hasOnlyBrs = cell.childNodes.length === brElements.length;
    if (hasOnlyBrs) {
      cell.innerHTML = '&nbsp;'; // Empty cell with space
    }
  }
  
  // Make sure empty cells have proper height
  if (cell.innerHTML.trim() === '') {
    cell.innerHTML = '&nbsp;';
  }
  
  // Fix nested spans that might break layout
  const spans = cell.querySelectorAll('span');
  spans.forEach(span => {
    // Fix problematic spans
    if (span.style.position === 'absolute' || span.style.display === 'none') {
      // Keep content but fix styling
      span.style.position = 'static';
      span.style.display = 'inline';
    }
  });
}

/**
 * Process Google Docs lists to ensure proper HTML structure
 * @param doc The HTML document to process
 */
function processGoogleDocsLists(doc: Document): void {
  // Google Docs lists often have specific class names or structures
  // Look for lists or list-like structures
  
  // Process ordered lists
  const orderedLists = doc.querySelectorAll('div[class*="list-ordered"], div[style*="list-style-type: decimal"]');
  orderedLists.forEach(listDiv => {
    convertDivToList(listDiv, 'ol');
  });
  
  // Process unordered lists
  const unorderedLists = doc.querySelectorAll('div[class*="list-unordered"], div[style*="list-style-type: disc"]');
  unorderedLists.forEach(listDiv => {
    convertDivToList(listDiv, 'ul');
  });
}

/**
 * Convert a div that represents a list to a proper HTML list
 * @param listDiv The div element to convert
 * @param listType The type of list ('ul' or 'ol')
 */
function convertDivToList(listDiv: Element, listType: 'ul' | 'ol'): void {
  // Create a new list element
  const list = document.createElement(listType);
  
  // Find list items (usually divs or paragraphs)
  const itemDivs = listDiv.querySelectorAll('div, p');
  
  itemDivs.forEach(itemDiv => {
    const li = document.createElement('li');
    li.innerHTML = itemDiv.innerHTML;
    list.appendChild(li);
  });
  
  // Replace the div with the list
  listDiv.parentNode?.replaceChild(list, listDiv);
}

/**
 * Detect and convert paragraph structures that represent tables
 * @param doc The HTML document to process
 */
function detectTableStructureInParagraphs(doc: Document): void {
  // Look for sections that might contain table-like content
  detectBudgetTable(doc);
  detectTimelineTable(doc);
}

/**
 * Detect and convert budget table from paragraphs
 * @param doc The HTML document to process
 */
function detectBudgetTable(doc: Document): void {
  // Look for budget section heading
  const budgetHeadings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(
    heading => (heading.textContent?.toLowerCase() || '').includes('budget')
  );
  
  if (budgetHeadings.length > 0) {
    const budgetHeading = budgetHeadings[0];
    
    // Look for paragraphs after the budget heading
    const paragraphs: Element[] = [];
    let currentElement = budgetHeading.nextElementSibling;
    
    // Collect paragraphs until we hit another heading or run out of elements
    while (currentElement && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentElement.tagName)) {
      if (currentElement.tagName === 'P') {
        paragraphs.push(currentElement);
      }
      currentElement = currentElement.nextElementSibling;
    }
    
    // Check if these paragraphs look like a budget table
    if (paragraphs.length > 0) {
      const budgetRows: string[][] = [];
      
      // Add header row
      budgetRows.push(['Item', 'Description', 'Cost']);
      
      // Process paragraphs to extract budget items
      paragraphs.forEach(paragraph => {
        const text = paragraph.textContent || '';
        
        // Skip empty paragraphs
        if (!text.trim()) return;
        
        // Look for patterns like "Item: Description - $1000"
        const budgetMatch = text.match(/([^:]+):\s*([^-$]+)\s*-?\s*\$?(\d[\d,.]*)/);
        
        if (budgetMatch) {
          budgetRows.push([
            budgetMatch[1].trim(),
            budgetMatch[2].trim(),
            '$' + budgetMatch[3].trim()
          ]);
        } else if (text.includes('$')) {
          // Fallback: If there's a dollar sign, try to split by it
          const parts = text.split('$');
          if (parts.length >= 2) {
            const description = parts[0].trim();
            const cost = '$' + parts[1].trim();
            budgetRows.push([description, '', cost]);
          }
        }
      });
      
      // If we found budget items, create a table
      if (budgetRows.length > 1) {
        const table = createTableFromRows(budgetRows, true);
        
        // Insert the table after the budget heading
        const tableElement = document.createElement('div');
        tableElement.innerHTML = table;
        
        budgetHeading.parentNode?.insertBefore(tableElement.firstChild!, budgetHeading.nextSibling);
        
        // Remove the processed paragraphs
        paragraphs.forEach(paragraph => {
          paragraph.parentNode?.removeChild(paragraph);
        });
      }
    }
  }
}

/**
 * Detect and convert timeline table from paragraphs
 * @param doc The HTML document to process
 */
function detectTimelineTable(doc: Document): void {
  // Look for timeline section heading
  const timelineHeadings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(
    heading => (heading.textContent?.toLowerCase() || '').includes('timeline') ||
              (heading.textContent?.toLowerCase() || '').includes('milestone') ||
              (heading.textContent?.toLowerCase() || '').includes('dry lab phase')
  );
  
  if (timelineHeadings.length > 0) {
    const timelineHeading = timelineHeadings[0];
    
    // Look for paragraphs after the timeline heading
    const paragraphs: Element[] = [];
    let currentElement = timelineHeading.nextElementSibling;
    
    // Collect paragraphs until we hit another heading or run out of elements
    while (currentElement && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentElement.tagName)) {
      if (currentElement.tagName === 'P') {
        paragraphs.push(currentElement);
      }
      currentElement = currentElement.nextElementSibling;
    }
    
    // Check if these paragraphs look like a timeline table
    if (paragraphs.length > 0) {
      const timelineRows: string[][] = [];
      
      // Add header row
      timelineRows.push(['Milestone', 'Description', 'Target Date']);
      
      // Process paragraphs to extract timeline items
      paragraphs.forEach(paragraph => {
        const text = paragraph.textContent || '';
        
        // Skip empty paragraphs
        if (!text.trim()) return;
        
        // Look for patterns like "M1: Target Selection - Week 2"
        const timelineMatch = text.match(/M(\d+):\s*([^-]+)\s*-?\s*(?:Week|Date|Target)?\s*(\d[\d\s\-–]*)/i);
        
        if (timelineMatch) {
          timelineRows.push([
            'M' + timelineMatch[1].trim() + ': ' + timelineMatch[2].trim(),
            '',
            'Week ' + timelineMatch[3].trim()
          ]);
        } else if (text.includes('Week') || text.includes('M1') || text.includes('M2')) {
          // Fallback: If there's a week reference or milestone reference
          const parts = text.split(':');
          if (parts.length >= 2) {
            const milestone = parts[0].trim();
            const description = parts[1].trim();
            
            // Try to extract the date
            const dateMatch = description.match(/(Week|Date|Target)?\s*(\d[\d\s\-–]*)/i);
            let targetDate = '';
            let desc = description;
            
            if (dateMatch) {
              targetDate = dateMatch[0].trim();
              desc = description.replace(dateMatch[0], '').trim();
            }
            
            timelineRows.push([milestone, desc, targetDate]);
          }
        }
      });
      
      // If we found timeline items, create a table
      if (timelineRows.length > 1) {
        const table = createTableFromRows(timelineRows, false);
        
        // Insert the table after the timeline heading
        const tableElement = document.createElement('div');
        tableElement.innerHTML = table;
        
        timelineHeading.parentNode?.insertBefore(tableElement.firstChild!, timelineHeading.nextSibling);
        
        // Remove the processed paragraphs
        paragraphs.forEach(paragraph => {
          paragraph.parentNode?.removeChild(paragraph);
        });
      }
    }
  }
}

/**
 * Create an HTML table from rows of data
 * @param rows Array of rows, where each row is an array of cell contents
 * @param isBudgetTable Whether this is a budget table (for specific styling)
 * @returns HTML string for the table
 */
function createTableFromRows(rows: string[][], isBudgetTable: boolean = false): string {
  // Create table HTML
  let tableHtml = `
    <div style="overflow-x:auto;max-width:100%;margin:1.5rem 0;">
      <table style="border-collapse:collapse;width:100%;margin:0;border:1px solid rgba(255,255,255,0.2);font-family:var(--font-acuminMedium),sans-serif;background:transparent;">
        <thead>
          <tr>
  `;
  
  // Add header cells
  rows[0].forEach(header => {
    tableHtml += `<th style="border:1px solid rgba(255,255,255,0.2);padding:0.75rem;color:white;text-align:left;background-color:rgba(255,255,255,0.1);font-weight:bold;">${header}</th>`;
  });
  
  tableHtml += `
          </tr>
        </thead>
        <tbody>
  `;
  
  // Add data rows
  for (let i = 1; i < rows.length; i++) {
    const rowStyle = i % 2 === 0 ? 'background-color:rgba(255,255,255,0.05);' : 'background-color:transparent;';
    tableHtml += `<tr style="${rowStyle}">`;
    
    rows[i].forEach((cell, cellIndex) => {
      // For budget tables, right-align the cost column
      const cellStyle = isBudgetTable && cellIndex === rows[i].length - 1 
        ? 'text-align:right;' 
        : 'text-align:left;';
      
      tableHtml += `<td style="border:1px solid rgba(255,255,255,0.2);padding:0.75rem;color:white;${cellStyle}background:transparent;">${cell}</td>`;
    });
    
    tableHtml += `</tr>`;
  }
  
  tableHtml += `
        </tbody>
      </table>
    </div>
  `;
  
  return tableHtml;
}

/**
 * Preserve text formatting from Google Docs
 * @param doc The HTML document to process
 */
function preserveTextFormatting(doc: Document): void {
  // Process spans with inline styles
  const spans = doc.querySelectorAll('span[style]');
  spans.forEach(span => {
    const style = span.getAttribute('style') || '';
    
    // Convert Google Docs font-weight to proper HTML tags
    if (style.includes('font-weight:700') || style.includes('font-weight:bold') || style.includes('font-weight: bold')) {
      const strong = document.createElement('strong');
      strong.innerHTML = span.innerHTML;
      span.parentNode?.replaceChild(strong, span);
    }
    // Convert Google Docs font-style to proper HTML tags
    else if (style.includes('font-style:italic') || style.includes('font-style: italic')) {
      const em = document.createElement('em');
      em.innerHTML = span.innerHTML;
      span.parentNode?.replaceChild(em, span);
    }
    // Convert Google Docs text-decoration to proper HTML tags
    else if (style.includes('text-decoration:underline') || style.includes('text-decoration: underline')) {
      const u = document.createElement('u');
      u.innerHTML = span.innerHTML;
      span.parentNode?.replaceChild(u, span);
    }
    // Convert Google Docs text-decoration:line-through to proper HTML tags
    else if (style.includes('text-decoration:line-through') || style.includes('text-decoration: line-through')) {
      const s = document.createElement('s');
      s.innerHTML = span.innerHTML;
      span.parentNode?.replaceChild(s, span);
    }
  });
  
  // Process Google Docs specific classes
  const styledElements = doc.querySelectorAll('[class*="docs-"]');
  styledElements.forEach(element => {
    const className = element.getAttribute('class') || '';
    
    // Convert Google Docs classes to proper HTML tags
    if (className.includes('docs-heading')) {
      // Determine heading level from class name or default to h2
      let level = 2;
      const match = className.match(/docs-heading-(\d+)/);
      if (match && match[1]) {
        level = parseInt(match[1], 10);
        // Ensure level is between 1 and 6
        level = Math.max(1, Math.min(6, level));
      }
      
      const heading = document.createElement(`h${level}`);
      heading.innerHTML = element.innerHTML;
      element.parentNode?.replaceChild(heading, element);
    }
  });
  
  // Process Google Docs paragraphs with specific styles
  const paragraphs = doc.querySelectorAll('p[style]');
  paragraphs.forEach(paragraph => {
    const style = paragraph.getAttribute('style') || '';
    
    // Preserve text alignment
    if (style.includes('text-align:center') || style.includes('text-align: center')) {
      // Cast to HTMLElement to access style property
      const htmlParagraph = paragraph as HTMLElement;
      htmlParagraph.style.textAlign = 'center';
    } else if (style.includes('text-align:right') || style.includes('text-align: right')) {
      // Cast to HTMLElement to access style property
      const htmlParagraph = paragraph as HTMLElement;
      htmlParagraph.style.textAlign = 'right';
    } else if (style.includes('text-align:justify') || style.includes('text-align: justify')) {
      // Cast to HTMLElement to access style property
      const htmlParagraph = paragraph as HTMLElement;
      htmlParagraph.style.textAlign = 'justify';
    }
    
    // Preserve margins and spacing
    if (style.includes('margin-left') || style.includes('padding-left')) {
      // This might be an indented paragraph or part of a list
      const indentMatch = style.match(/margin-left:\s*(\d+)px/);
      if (indentMatch && indentMatch[1]) {
        const indentLevel = Math.floor(parseInt(indentMatch[1], 10) / 40); // Approximate conversion
        if (indentLevel > 0) {
          // Cast to HTMLElement to access style property
          const htmlParagraph = paragraph as HTMLElement;
          htmlParagraph.style.marginLeft = `${indentLevel * 2}em`;
        }
      }
    }
  });
}

/**
 * Process headings in Google Docs content
 * @param doc The HTML document to process
 */
function processHeadings(doc: Document): void {
  // Google Docs often uses spans with specific styles for headings
  const potentialHeadings = doc.querySelectorAll('span[style*="font-size"], p[style*="font-size"]');
  
  potentialHeadings.forEach(element => {
    const style = element.getAttribute('style') || '';
    const fontSize = style.match(/font-size:\s*(\d+)pt/);
    
    if (fontSize && fontSize[1]) {
      const size = parseInt(fontSize[1], 10);
      let headingLevel = 0;
      
      // Map font sizes to heading levels
      if (size >= 20) headingLevel = 1;
      else if (size >= 16) headingLevel = 2;
      else if (size >= 14) headingLevel = 3;
      else if (size >= 12) headingLevel = 4;
      
      if (headingLevel > 0) {
        // Create a new heading element
        const heading = document.createElement(`h${headingLevel}`);
        heading.innerHTML = element.innerHTML;
        
        // Copy any other styles except font-size
        const newStyle = style.replace(/font-size:[^;]+;?/g, '');
        if (newStyle) {
          heading.setAttribute('style', newStyle);
        }
        
        // Replace the original element with the heading
        element.parentNode?.replaceChild(heading, element);
      }
    }
  });
}

/**
 * Process Google Docs specific styles
 * @param doc The HTML document to process
 */
function processGoogleDocsStyles(doc: Document): void {
  // Process Google Docs specific styles
  const styledElements = doc.querySelectorAll('[style]');
  
  styledElements.forEach(element => {
    const style = element.getAttribute('style') || '';
    
    // Convert Google Docs margin/padding to standard CSS
    if (style.includes('margin-left') || style.includes('padding-left')) {
      const htmlElement = element as HTMLElement;
      
      // Preserve indentation
      const indentMatch = style.match(/margin-left:\s*(\d+)pt/);
      if (indentMatch && indentMatch[1]) {
        const indentPt = parseInt(indentMatch[1], 10);
        // Convert pt to em (approximate)
        const indentEm = indentPt / 12;
        htmlElement.style.marginLeft = `${indentEm}em`;
      }
    }
    
    // Preserve line height
    if (style.includes('line-height')) {
      const lineHeightMatch = style.match(/line-height:\s*([\d.]+)/);
      if (lineHeightMatch && lineHeightMatch[1]) {
        const htmlElement = element as HTMLElement;
        htmlElement.style.lineHeight = lineHeightMatch[1];
      }
    }
    
    // Preserve text alignment
    if (style.includes('text-align')) {
      // Already handled in preserveTextFormatting, but ensure it's preserved
    }
    
    // Remove Google Docs specific styles that might interfere with rendering
    if (element.hasAttribute('id') && element.getAttribute('id')?.includes('docs-internal')) {
      element.removeAttribute('id');
    }
    
    // Remove Google Docs class names
    if (element.hasAttribute('class')) {
      const className = element.getAttribute('class') || '';
      if (className.includes('docs-')) {
        element.removeAttribute('class');
      }
    }
  });
}

/**
 * Detects and preserves text alignment from Google Docs content
 * @param doc The HTML document to process
 */
function preserveTextAlignment(doc: Document): void {
  // Track the most common alignment in the document
  const alignmentCounts = {
    left: 0,
    center: 0,
    right: 0,
    justify: 0
  };
  
  // Elements that might have alignment information
  const elementsWithAlignment = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div');
  
  elementsWithAlignment.forEach(element => {
    let alignment = '';
    
    // Check inline style for text-align
    const style = element.getAttribute('style') || '';
    const alignMatch = style.match(/text-align:\s*(left|center|right|justify)/i);
    
    if (alignMatch && alignMatch[1]) {
      alignment = alignMatch[1].toLowerCase();
    } 
    // Check for alignment classes
    else if (element.classList.contains('align-center') || element.classList.contains('center-align')) {
      alignment = 'center';
    } else if (element.classList.contains('align-right') || element.classList.contains('right-align')) {
      alignment = 'right';
    } else if (element.classList.contains('align-justify') || element.classList.contains('justify-align')) {
      alignment = 'justify';
    } else if (element.classList.contains('align-left') || element.classList.contains('left-align')) {
      alignment = 'left';
    }
    
    // Track the alignment if found
    if (alignment && Object.prototype.hasOwnProperty.call(alignmentCounts, alignment)) {
      alignmentCounts[alignment]++;
    }
    
    // Ensure alignment is preserved in the element's style
    if (alignment) {
      // Create or update style attribute
      const currentStyle = element.getAttribute('style') || '';
      if (!currentStyle.includes('text-align')) {
        element.setAttribute('style', 
          `${currentStyle}${currentStyle ? '; ' : ''}text-align: ${alignment}`);
      }
    }
  });
  
  // Add a data attribute to the body with the most common alignment
  let mostCommonAlignment = 'left'; // Default
  let maxCount = 0;
  
  for (const [alignment, count] of Object.entries(alignmentCounts)) {
    if (count > maxCount) {
      mostCommonAlignment = alignment;
      maxCount = count;
    }
  }
  
  // Only set if there's a clear winner
  if (maxCount > 0) {
    doc.body.setAttribute('data-google-docs-default-alignment', mostCommonAlignment);
    console.debug('Detected Google Docs default alignment:', mostCommonAlignment);
  }
  
  // For heading elements, make sure they have explicit alignment
  // Google Docs often has headings with centered alignment
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    const style = heading.getAttribute('style') || '';
    
    // If heading doesn't have explicit alignment, check for features that suggest center alignment
    if (!style.includes('text-align')) {
      // Some heading elements in Google Docs have specific classes or appearance
      // that suggest they should be centered
      const isCentered = heading.classList.contains('title') || 
                        heading.classList.contains('heading') ||
                        heading.getAttribute('role') === 'heading';
      
      if (isCentered) {
        heading.setAttribute('style', 
          `${style}${style ? '; ' : ''}text-align: center`);
      } else {
        // Use the document's most common alignment
        heading.setAttribute('style', 
          `${style}${style ? '; ' : ''}text-align: ${mostCommonAlignment}`);
      }
    }
  });
}

/**
 * Fix spacing between bold and regular text
 * @param html The HTML content to process
 * @returns HTML with fixed spacing
 */
function fixBoldTextSpacing(html: string): string {
  // Add space after closing strong/b tags if followed by a word character
  html = html.replace(/(<\/(?:strong|b)>)([a-zA-Z0-9])/g, '$1 $2');
  
  // Add space before opening strong/b tags if preceded by a word character
  html = html.replace(/([a-zA-Z0-9])(<(?:strong|b)>)/g, '$1 $2');
  
  return html;
}

/**
 * Process Google Docs horizontal rules
 * @param doc The HTML document to process
 */
function processGoogleDocsHorizontalRules(doc: Document): void {
  // First, handle Google Docs specific horizontal line markers
  const horizontalLineMarkers = doc.querySelectorAll([
    'div[style*="border-top"]',
    'p[style*="border-top"]',
    'div[class*="horizontal-line"]',
    'p[class*="horizontal-line"]',
    '.kix-linebreak',
    '.docs-horizontal-rule'
  ].join(','));
  
  horizontalLineMarkers.forEach(marker => {
    if (!marker.parentNode) return;
    const hr = doc.createElement('hr');
    hr.style.border = 'none';
    hr.style.height = '1px';
    hr.style.backgroundColor = '#E5E7EB';
    hr.style.margin = '1.5rem 0';
    marker.parentNode.replaceChild(hr, marker);
  });

  // Then handle consecutive empty paragraphs
  const paragraphs = Array.from(doc.getElementsByTagName('p'));
  let i = 0;
  
  while (i < paragraphs.length) {
    let consecutiveCount = 0;
    const startIndex = i;
    
    // Count consecutive empty paragraphs
    while (i < paragraphs.length && isEmptyParagraph(paragraphs[i])) {
      consecutiveCount++;
      i++;
    }
    
    // If we found 2 or more consecutive empty paragraphs
    if (consecutiveCount >= 2) {
      const startParagraph = paragraphs[startIndex];
      if (!startParagraph.parentNode) {
        i = startIndex + 1;
        continue;
      }

      // Create a single HR element
      const hr = doc.createElement('hr');
      hr.style.border = 'none';
      hr.style.height = '1px';
      hr.style.backgroundColor = '#E5E7EB';
      hr.style.margin = '1.5rem 0';
      
      // Replace the first empty paragraph with the HR
      startParagraph.parentNode.replaceChild(hr, startParagraph);
      
      // Remove all other empty paragraphs in this sequence
      for (let j = startIndex + 1; j < startIndex + consecutiveCount; j++) {
        const paragraph = paragraphs[j];
        if (paragraph.parentNode) {
          paragraph.parentNode.removeChild(paragraph);
        }
      }
    } else {
      i++;
    }
  }

  // Final cleanup: ensure no duplicate HRs or empty paragraphs between HRs
  const allHrs = Array.from(doc.querySelectorAll('hr'));
  for (let i = 0; i < allHrs.length - 1; i++) {
    const currentHr = allHrs[i];
    if (!currentHr.parentNode) continue;
    
    let node = currentHr.nextSibling;
    const nextHr = allHrs[i + 1];
    
    // Remove any empty paragraphs between HRs
    while (node && node !== nextHr) {
      const nextNode = node.nextSibling;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === 'P' && isEmptyParagraph(element) && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
      node = nextNode;
    }
    
    // If HRs are now adjacent, remove the second one
    if (currentHr.nextSibling === nextHr && nextHr.parentNode) {
      nextHr.parentNode.removeChild(nextHr);
      allHrs.splice(i + 1, 1);
      i--;
    }
  }
}

/**
 * Check if a paragraph element is empty (contains only whitespace)
 * @param p The paragraph element to check
 * @returns true if the paragraph is empty
 */
function isEmptyParagraph(p: Element): boolean {
  // Check for actual content
  if (!p.textContent || p.textContent.trim() === '') {
    // Also check for any meaningful elements (ignore style spans)
    const meaningfulElements = p.querySelectorAll('img, br, hr, table, ul, ol, div');
    return meaningfulElements.length === 0;
  }
  return false;
} 