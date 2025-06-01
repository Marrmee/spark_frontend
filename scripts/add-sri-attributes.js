#!/usr/bin/env node

/**
 * This script adds Subresource Integrity (SRI) attributes to external scripts and stylesheets
 * in HTML files. SRI helps ensure that resources loaded from external sources haven't been
 * tampered with, which would have prevented the Safe Wallet hack.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const glob = require('glob');

// Configuration
const BUILD_DIR = path.join(__dirname, '../.next');
const HTML_PATTERN = '**/*.html';

/**
 * Fetches the content of a URL
 * @param {string} url The URL to fetch
 * @returns {Promise<string>} The content of the URL
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      
    }).on('error', reject);
  });
}

/**
 * Generates an SRI hash for content
 * @param {string} content The content to hash
 * @returns {string} The SRI hash
 */
function generateSriHash(content) {
  const hash = crypto.createHash('sha384').update(content).digest('base64');
  return `sha384-${hash}`;
}

/**
 * Adds SRI attributes to scripts and stylesheets in an HTML file
 * @param {string} filePath The path to the HTML file
 */
async function addSriAttributes(filePath) {
  console.log(`Processing ${filePath}...`);
  
  let html = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Find all script tags with src attribute
  const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g;
  const scriptMatches = [...html.matchAll(scriptRegex)];
  
  for (const match of scriptMatches) {
    const fullTag = match[0];
    const src = match[1];
    
    // Skip if already has integrity attribute
    if (fullTag.includes('integrity=')) continue;
    
    // Skip relative URLs
    if (!src.startsWith('http')) continue;
    
    try {
      console.log(`  Fetching ${src}...`);
      const content = await fetchUrl(src);
      const integrity = generateSriHash(content);
      
      // Add integrity and crossorigin attributes
      const newTag = fullTag.replace(
        /(<script[^>]+src=["'][^"']+["'])([^>]*)(><\/script>)/,
        `$1 integrity="${integrity}" crossorigin="anonymous"$2$3`
      );
      
      html = html.replace(fullTag, newTag);
      modified = true;
      console.log(`  Added SRI hash: ${integrity}`);
      
    } catch (error) {
      console.error(`  Error processing ${src}:`, error.message);
    }
  }
  
  // Find all link tags with rel="stylesheet"
  const styleRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/g;
  const styleMatches = [...html.matchAll(styleRegex)];
  
  for (const match of styleMatches) {
    const fullTag = match[0];
    const href = match[1];
    
    // Skip if already has integrity attribute
    if (fullTag.includes('integrity=')) continue;
    
    // Skip relative URLs
    if (!href.startsWith('http')) continue;
    
    try {
      console.log(`  Fetching ${href}...`);
      const content = await fetchUrl(href);
      const integrity = generateSriHash(content);
      
      // Add integrity and crossorigin attributes
      const newTag = fullTag.replace(
        /(<link[^>]+href=["'][^"']+["'])([^>]*)(>)/,
        `$1 integrity="${integrity}" crossorigin="anonymous"$2$3`
      );
      
      html = html.replace(fullTag, newTag);
      modified = true;
      console.log(`  Added SRI hash: ${integrity}`);
      
    } catch (error) {
      console.error(`  Error processing ${href}:`, error.message);
    }
  }
  
  // Save the modified HTML file
  if (modified) {
    fs.writeFileSync(filePath, html);
    console.log(`  Updated ${filePath}`);
  } else {
    console.log(`  No changes needed for ${filePath}`);
  }
}

/**
 * Main function to process all HTML files
 */
async function main() {
  console.log('Adding SRI attributes to external resources...');
  
  // Find all HTML files
  const files = glob.sync(HTML_PATTERN, {
    cwd: BUILD_DIR,
    absolute: true,
  });
  
  console.log(`Found ${files.length} HTML files to process`);
  
  // Process each file
  for (const file of files) {
    await addSriAttributes(file);
  }
  
  console.log('SRI attributes added successfully');
}

// Run the script
main().catch(error => {
  console.error('Error adding SRI attributes:', error);
  process.exit(1);
}); 