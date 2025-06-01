interface UrlValidationResult {
  isValid: boolean;
  error?: string;
}

export async function validateUrls(text: string): Promise<UrlValidationResult> {
  // Regular expression to find URLs in text
  const urlRegex = /(https?:\/\/[^\s<>"\']+([\w-]+\.)+[\w-]+[^\s<>"\']*)|(www\.[^\s<>"\']+([\w-]+\.)+[\w-]+[^\s<>"\']*)/gi;
  
  const urls = text.match(urlRegex);
  if (!urls) return { isValid: true };

  // List of suspicious TLD patterns
  const suspiciousTlds = /\.(xyz|tk|ml|ga|cf|gq|top|wang|win|loan|online|party|download|click|link|bid|trade|racing|date|kim|country|science|work|ninja|space|cricket|stream|accountant|faith|review|realtor|christmas|cooking|fashion|fishing|horse|miami|rodeo|vodka|wtf|zip|mov|mba|pro|red|blue|pink|black|poker|diet|sexy|rocks|vegas|buzz|fun|mom|dad)$/i;

  // List of known phishing domains (should be regularly updated)
  const knownPhishingDomains = [
    'etherdelta',
    'myetherwallet',
    'metamask',
    'blockchain',
    'binance',
    'coinbase',
    'kraken',
    'bittrex',
    'poloniex',
  ];

  for (const url of urls) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      
      // Check for suspicious TLDs
      if (suspiciousTlds.test(urlObj.hostname)) {
        return {
          isValid: false,
          error: `Suspicious top-level domain detected in URL: ${url}`
        };
      }

      // Check for potential phishing domains
      const domainParts = urlObj.hostname.toLowerCase().split('.');
      if (knownPhishingDomains.some(domain => 
        domainParts.some(part => 
          part.includes(domain) && part !== domain
        )
      )) {
        return {
          isValid: false,
          error: `Potential phishing domain detected: ${url}`
        };
      }

      // Check for URL shorteners
      const shortenerServices = [
        'bit.ly',
        'tinyurl.com',
        'goo.gl',
        't.co',
        'tiny.cc',
        'is.gd',
        'cli.gs',
        'pic.gd',
        'DwarfURL.com',
        'ow.ly',
        'snipurl.com',
        'short.to'
      ];
      
      if (shortenerServices.some(service => urlObj.hostname.includes(service))) {
        return {
          isValid: false,
          error: `URL shorteners are not allowed for security reasons: ${url}`
        };
      }

      // Check for excessive subdomains (potential phishing tactic)
      if (urlObj.hostname.split('.').length > 4) {
        return {
          isValid: false,
          error: `Suspicious number of subdomains detected: ${url}`
        };
      }

      // Check for numeric IPs
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(urlObj.hostname)) {
        return {
          isValid: false,
          error: `Direct IP addresses are not allowed: ${url}`
        };
      }

    } catch (error) {
      return {
        isValid: false,
        error: `Invalid URL format: ${url}`
      };
    }
  }

  return { isValid: true };
} 