#!/usr/bin/env node

/**
 * This script generates an integrity manifest for JavaScript files
 * It should be run during the build process to create a manifest of file hashes
 * that can be used for runtime integrity verification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('glob');

// Configuration
const BUILD_DIR = path.join(__dirname, '../.next');
const OUTPUT_FILE = path.join(__dirname, '../public/integrity-manifest.json');
const INCLUDE_PATTERNS = [
  '**/*.js',
  '**/*.mjs',
];
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/_next/cache/**',
];

// Environment-specific configuration
const ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = ENV === 'production';

// Debug mode - set to true to generate more verbose output
const DEBUG = process.env.DEBUG === 'true';

/**
 * Check if a buffer is likely to be a binary file
 * @param {Buffer} buffer The file buffer to check
 * @returns {boolean} True if the file is likely binary
 */
function isBinaryFile(buffer) {
  // Check for null bytes which typically indicate binary content
  for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  
  // Check for high concentration of non-printable characters
  let nonPrintable = 0;
  const sampleSize = Math.min(buffer.length, 1024);
  
  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    // Non-printable ASCII characters (except for common whitespace)
    if ((byte < 32 && ![9, 10, 13].includes(byte)) || byte >= 127) {
      nonPrintable++;
    }
  }
  
  // If more than 10% are non-printable, consider it binary
  return (nonPrintable / sampleSize) > 0.1;
}

/**
 * Generate an SRI integrity hash for a file
 * @param {string} filePath Path to the file
 * @returns {string} SRI integrity hash
 */
function generateIntegrityHash(filePath) {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha384').update(content).digest('base64');
  return `sha384-${hash}`;
}

/**
 * Generate path variations for better matching during verification
 * @param {string} relativePath The relative path of the file
 * @returns {string[]} Array of path variations
 */
function generatePathVariations(relativePath) {
  const filename = path.basename(relativePath);
  const variations = [
    relativePath,                  // Full relative path
    filename,                      // Just the filename
    `/${relativePath}`,            // With leading slash
    `/${filename}`,                // Filename with leading slash
  ];
  
  // Add path without file extension
  if (filename.includes('.')) {
    const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    variations.push(filenameWithoutExt);
    variations.push(`/${filenameWithoutExt}`);
  }
  
  // Add variations without query parameters
  if (relativePath.includes('?')) {
    const pathWithoutQuery = relativePath.split('?')[0];
    variations.push(pathWithoutQuery);
    variations.push(`/${pathWithoutQuery}`);
  }
  
  // Add variations with common URL parameters that might be added by wallet browsers
  if (IS_PRODUCTION) {
    variations.push(`${relativePath}?v=${Date.now()}`);
    variations.push(`${relativePath}?t=${Date.now()}`);
    variations.push(`${relativePath}?_=${Date.now()}`);
    variations.push(`${filename}?v=${Date.now()}`);
  }
  
  // Add _next prefix variations for better matching in production
  if (!relativePath.startsWith('_next/')) {
    variations.push(`_next/${relativePath}`);
    variations.push(`_next/${filename}`);
  }
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Generate alternative content hashes for wallet browsers
 * @param {Buffer|string} content The file content
 * @returns {Object} Object with original and alternative hashes
 */
function generateAlternativeHashes(content) {
  // Ensure we're working with a Buffer for consistent hashing
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  
  // Original hash from the buffer
  const originalHash = crypto.createHash('sha384').update(contentBuffer).digest('base64');
  
  // For text files, generate alternative hashes with common modifications
  let alternatives = [];
  
  if (!isBinaryFile(contentBuffer)) {
    try {
      // Convert buffer to string for text operations
      const contentString = contentBuffer.toString('utf8');
      
      // Some wallet browsers might add whitespace or line breaks
      const contentWithExtraSpace = contentString + ' ';
      const spaceHash = crypto.createHash('sha384')
        .update(contentWithExtraSpace)
        .digest('base64');
      
      // Some might normalize line endings
      const contentWithNormalizedLineEndings = contentString.replace(/\r\n/g, '\n');
      const lineEndingHash = crypto.createHash('sha384')
        .update(contentWithNormalizedLineEndings)
        .digest('base64');
      
      alternatives = [
        `sha384-${spaceHash}`,
        `sha384-${lineEndingHash}`
      ];
    } catch (error) {
      console.warn(`Warning: Could not generate alternative hashes: ${error.message}`);
      // For binary or problematic files, just use empty alternatives
      alternatives = [];
    }
  } else if (DEBUG) {
    // For binary files, we don't generate text-based alternatives
    console.log('  Binary file detected, skipping alternative hash generation');
  }
  
  return {
    original: `sha384-${originalHash}`,
    alternatives
  };
}

/**
 * Main function to generate the integrity manifest
 */
async function generateManifest() {
  console.log(`Generating integrity manifest for ${ENV} environment...`);
  
  // Create the manifest object
  const manifest = {};
  
  // Find all JavaScript files
  const files = glob.sync(INCLUDE_PATTERNS, {
    cwd: BUILD_DIR,
    ignore: EXCLUDE_PATTERNS,
    absolute: true,
  });
  
  console.log(`Found ${files.length} files to process`);
  
  let processedCount = 0;
  let errorCount = 0;
  let binaryCount = 0;
  
  // Track files by type for debugging
  const fileTypes = {
    binary: [],
    text: [],
    error: []
  };
  
  // Generate hashes for each file
  for (const file of files) {
    try {
      const relativePath = path.relative(BUILD_DIR, file);
      
      // Read file as buffer to properly handle both text and binary files
      const contentBuffer = fs.readFileSync(file);
      
      // Check if this is a binary file
      const isBinary = isBinaryFile(contentBuffer);
      if (isBinary) {
        binaryCount++;
        if (DEBUG) {
          console.log(`Binary file detected: ${relativePath}`);
        }
        fileTypes.binary.push(relativePath);
      } else {
        fileTypes.text.push(relativePath);
      }
      
      // For production, generate alternative hashes to handle wallet browser variations
      let hash;
      if (IS_PRODUCTION) {
        const hashes = generateAlternativeHashes(contentBuffer);
        hash = hashes.original;
        
        // Store alternative hashes with special keys
        const pathVariations = generatePathVariations(relativePath);
        for (const variation of pathVariations) {
          manifest[variation] = hash;
          
          // Add alternative hash entries for wallet browsers
          if (hashes.alternatives.length > 0) {
            hashes.alternatives.forEach((altHash, index) => {
              manifest[`${variation}__alt${index + 1}`] = altHash;
            });
          }
        }
      } else {
        // For non-production, just use the standard hash
        hash = generateIntegrityHash(file);
        
        // Store hash under multiple path variations for better matching
        const pathVariations = generatePathVariations(relativePath);
        for (const variation of pathVariations) {
          manifest[variation] = hash;
        }
      }
      
      processedCount++;
      if (processedCount % 10 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      errorCount++;
      fileTypes.error.push(path.relative(BUILD_DIR, file));
      console.error(`\nError processing ${file}: ${error.message}`);
    }
  }
  
  console.log(`\nProcessed ${processedCount} files with ${errorCount} errors`);
  console.log(`Binary files detected: ${binaryCount}`);
  console.log('Writing manifest to', OUTPUT_FILE);
  
  // Ensure the directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Add metadata to the manifest
  manifest.__metadata = {
    generatedAt: new Date().toISOString(),
    environment: ENV,
    fileCount: files.length,
    processedCount,
    errorCount,
    binaryCount,
    entryCount: Object.keys(manifest).length - 1, // Subtract the metadata entry
  };
  
  // Write the manifest file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`Integrity manifest generated successfully with ${Object.keys(manifest).length - 1} entries`);
  
  // In production, also create a debug version with more information
  if (IS_PRODUCTION || DEBUG) {
    const debugManifest = { ...manifest };
    debugManifest.__debug = {
      userAgentPatterns: [
        'MetaMask',
        'CoinbaseWallet',
        'Trust',
        'TokenPocket',
        'Brave',
        'Opera',
        'Status',
        'ImToken',
        'Rainbow'
      ],
      relaxedVerificationEnabled: true,
      alternativeHashesGenerated: true,
      fileTypes: {
        binary: fileTypes.binary,
        error: fileTypes.error,
        // Only include a sample of text files to keep the file size reasonable
        text: fileTypes.text.slice(0, 20)
      }
    };
    
    fs.writeFileSync(
      OUTPUT_FILE.replace('.json', '.debug.json'),
      JSON.stringify(debugManifest, null, 2)
    );
    
    console.log('Debug manifest also generated for troubleshooting');
  }
}

// Run the script
generateManifest().catch(error => {
  console.error('Error generating integrity manifest:', error);
  process.exit(1);
}); 