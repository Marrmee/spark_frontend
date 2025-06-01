import { NextRequest, NextResponse } from 'next/server';

interface JsonFileData {
  [key: string]: unknown;
}

/**
 * Validates the input for uploading to Pinata
 * @param jsonFile The JSON file to upload
 * @param indexGovRes The research proposal index (can be string or number)
 * @param recaptchaToken The recaptcha token for verification
 */
function validateInput(
  jsonFile: JsonFileData,
  indexGovRes: number | string,
  recaptchaToken: string
): { isValid: boolean; error?: string } {
  // Validate JSON file
  if (!jsonFile || typeof jsonFile !== 'object') {
    return { isValid: false, error: 'JSON file is required and must be an object' };
  }

  // Check if the research index is provided and valid
  const parsedIndexGovRes = typeof indexGovRes === 'string'
    ? parseInt(indexGovRes, 10)
    : indexGovRes;

  if (isNaN(parsedIndexGovRes)) {
    return { isValid: false, error: 'Invalid number format for governance indices' };
  }

  if (typeof parsedIndexGovRes !== 'number' || parsedIndexGovRes < 0) {
    return { isValid: false, error: 'Invalid research governance index' };
  }

  // Validate recaptcha token
  if (!recaptchaToken || typeof recaptchaToken !== 'string') {
    return { isValid: false, error: 'Recaptcha token is required' };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { jsonFile, indexGovRes, recaptchaToken } = body;

    console.log('Request body parsed:', {
      hasJsonFile: !!jsonFile,
      indexGovRes: typeof indexGovRes,
      hasRecaptchaToken: !!recaptchaToken,
      indexGovResValue: indexGovRes,
    });

    const validation = validateInput(jsonFile, indexGovRes, recaptchaToken);
    if (!validation.isValid) {
      console.error('Validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    console.log('Input validation passed:', {
      indexGovResType: typeof indexGovRes,
      indexGovResValue: indexGovRes,
    });

    // Parse the research governance index
    const parsedIndexGovRes = typeof indexGovRes === 'string'
      ? parseInt(indexGovRes, 10)
      : indexGovRes;

    // Verify with Google reCAPTCHA
    const recaptchaResponse = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      { method: 'POST' }
    );

    const recaptchaData = await recaptchaResponse.json();
    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      console.error('reCAPTCHA verification failed:', recaptchaData);
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed' },
        { status: 400 }
      );
    }

    console.log('reCAPTCHA verification passed');

    // Create file name with timestamp
    const timestamp = Date.now();
    const fileName = `research-proposal-${parsedIndexGovRes}-${timestamp}`;

    console.log('Generated filename:', fileName);

    // Upload to Pinata
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    if (!pinataApiKey || !pinataSecretApiKey) {
      console.error('Pinata API keys not configured');
      return NextResponse.json(
        { error: 'Pinata API keys not configured' },
        { status: 500 }
      );
    }

    const pinataResponse = await fetch(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
        body: JSON.stringify({
          pinataContent: jsonFile,
          pinataMetadata: {
            name: fileName,
            keyvalues: {
              type: 'research',
              index: parsedIndexGovRes,
            },
          },
        }),
      }
    );

    if (!pinataResponse.ok) {
      const errorData = await pinataResponse.text();
      console.error('Pinata upload failed:', {
        status: pinataResponse.status,
        statusText: pinataResponse.statusText,
        error: errorData,
      });
      return NextResponse.json(
        { error: 'Failed to upload to IPFS' },
        { status: 500 }
      );
    }

    const pinataData = await pinataResponse.json();
    console.log('Successfully uploaded to Pinata:', {
      ipfsHash: pinataData.IpfsHash,
      fileName,
    });

    return NextResponse.json({
      success: true,
      ipfsHash: pinataData.IpfsHash,
      fileName,
    });
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
