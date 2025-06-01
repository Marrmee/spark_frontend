// DocuSign client utility for Next.js API routes
// Uses CommonJS require to avoid webpack module resolution issues

const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_RSA_PRIVATE_KEY = process.env.DOCUSIGN_RSA_PRIVATE_KEY;
const DOCUSIGN_USER_GUID = process.env.DOCUSIGN_USER_GUID;
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';

// Token cache for JWT authentication
let accessTokenCache: { token: string; expiresAt: number } | null = null;

async function getDocuSignClasses() {
  const docusign = await import('docusign-esign');
  return {
    ApiClient: docusign.ApiClient,
    EnvelopesApi: docusign.EnvelopesApi,
    TemplatesApi: docusign.TemplatesApi
  };
}

async function getAccessToken(): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_RSA_PRIVATE_KEY || !DOCUSIGN_USER_GUID) {
    throw new Error('DocuSign environment variables not configured for JWT authentication.');
  }

  try {
    const { ApiClient } = await getDocuSignClasses();
    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_BASE_PATH);

    let privateKey = DOCUSIGN_RSA_PRIVATE_KEY;
    if (!privateKey.includes('-----BEGIN')) {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
    }

    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_GUID,
      ['signature', 'impersonation'],
      Buffer.from(privateKey, 'utf8'),
      3600
    );

    if (!results.body || !results.body.access_token) {
      throw new Error('Failed to obtain access token from DocuSign');
    }

    accessTokenCache = {
      token: results.body.access_token,
      expiresAt: Date.now() + (results.body.expires_in - 60) * 1000
    };

    return results.body.access_token;
  } catch (error: unknown) {
    console.error('[DocuSign JWT] Error obtaining access token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`DocuSign authentication failed: ${errorMessage}`);
  }
}

export async function getDocusignApiClient() {
  const accessToken = await getAccessToken();
  
  const { ApiClient } = await getDocuSignClasses();
  const apiClient = new ApiClient();
  apiClient.setBasePath(DOCUSIGN_BASE_PATH);
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
  
  return apiClient;
}

export { getDocuSignClasses }; 