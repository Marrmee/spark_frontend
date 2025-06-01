import OpenAI from 'openai';

// Types
export interface ModerationRequest {
  content: string | {
    title?: string;
    summary?: string;
    body?: string;
  };
  action: 'check' | 'report' | 'approve' | 'hide' | 'dismiss_reports';
  recaptchaToken?: string;
  commentId?: number;
}

export interface ModerationResponse {
  flagged: boolean;
  score?: number;
  details?: {
    message: string;
    highRiskContent?: boolean;
    mediumRiskContent?: boolean;
    lowRiskContent?: boolean;
    containsProfanity?: boolean;
    categories?: string[];
  };
  error?: string;
}

export interface ModerationDetails {
  highRiskContent: boolean;
  mediumRiskContent: boolean;
  lowRiskContent: boolean;
  containsProfanity: boolean;
  scores: OpenAI.Moderations.Moderation.CategoryScores;
  message?: string;
}

export interface ModerationResult {
  score: number;
  categories: OpenAI.Moderations.Moderation.Categories;
  flagged: boolean;
  details: ModerationDetails;
}

// Constants
const HIGH_RISK_CATEGORIES = [
  'hate',
  'hate/threatening',
  'self-harm',
  'sexual',
  'sexual/minors',
  'violence',
  'violence/graphic',
  'harassment/threatening',
];

const MEDIUM_RISK_CATEGORIES = [
  'spam',
  'harassment'
];

const LOW_RISK_CATEGORIES = [
  'scam'
];

const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'cunt', 'dick', 'pussy', 'cock'
];

// Thresholds
const THRESHOLDS = {
  proposal: {
    high: 0.3,
    medium: 0.7,
    low: 0.1
  },
  comment: {
    high: 0.85,
    medium: 0.6,
    low: 0.4
  }
};

// Helper function to check for whitelisted phrases
const WHITELISTED_PHRASES = [
  'asset to the team',
  'great job',
  'well done',
  'excellent work',
  'good work',
  "let's go",
  'amazing work',
  'fantastic job'
];

export function isWhitelisted(content: string): boolean {
  return WHITELISTED_PHRASES.some(phrase => 
    content.toLowerCase().includes(phrase.toLowerCase())
  );
}

// Helper function to check for profanity
export function containsProfanity(content: string): boolean {
  const lowerContent = content.toLowerCase(); // Lowercase content once
  return PROFANITY_LIST.some(word => {
    // PROFANITY_LIST words are already lowercase.
    // Create a regex to match the profanity as a whole word.
    const regex = new RegExp(`\b${word}\b`);
    return regex.test(lowerContent);
  });
}

// Main moderation function
export async function moderateContent(
  content: string,
  type: 'proposal' | 'comment' = 'comment'
): Promise<ModerationResult | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is not configured');
    return null;
  }

  try {
    // First check if content is whitelisted
    if (isWhitelisted(content)) {
      return {
        score: 0,
        categories: {} as OpenAI.Moderations.Moderation.Categories,
        flagged: false,
        details: {
          highRiskContent: false,
          mediumRiskContent: false,
          lowRiskContent: false,
          containsProfanity: false,
          scores: {} as OpenAI.Moderations.Moderation.CategoryScores,
        }
      };
    }

    // Then check for explicit profanity
    const hasProfanity = containsProfanity(content);
    if (hasProfanity) {
      return {
        score: 1,
        categories: {} as OpenAI.Moderations.Moderation.Categories,
        flagged: true,
        details: {
          highRiskContent: true,
          mediumRiskContent: false,
          lowRiskContent: false,
          containsProfanity: true,
          scores: {} as OpenAI.Moderations.Moderation.CategoryScores,
          message: 'Contains explicit profanity. Please remove any inappropriate language.'
        }
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.moderations.create({ input: content });
    
    if (!response.results || response.results.length === 0) {
      console.error('No moderation results returned from OpenAI');
      return null;
    }

    const result = response.results[0];
    const thresholds = THRESHOLDS[type];

    // Check for content in each risk category
    const hasHighRiskContent = HIGH_RISK_CATEGORIES.some(category => 
      result.category_scores[category as keyof typeof result.category_scores] > thresholds.high
    );

    const hasMediumRiskContent = MEDIUM_RISK_CATEGORIES.some(category => 
      result.category_scores[category as keyof typeof result.category_scores] > thresholds.medium
    );

    const hasLowRiskContent = LOW_RISK_CATEGORIES.some(category => 
      result.category_scores[category as keyof typeof result.category_scores] > thresholds.low
    );

    // Determine if content should be flagged
    const shouldFlag = hasHighRiskContent || hasMediumRiskContent || hasLowRiskContent || result.flagged;
    
    return {
      score: Math.max(...Object.values(result.category_scores)),
      categories: result.categories,
      flagged: shouldFlag,
      details: {
        highRiskContent: hasHighRiskContent,
        mediumRiskContent: hasMediumRiskContent,
        lowRiskContent: hasLowRiskContent,
        containsProfanity: false,
        scores: result.category_scores,
      }
    };
  } catch (error) {
    console.error('AI moderation error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    return null;
  }
}

// Helper function to format moderation response
export function formatModerationResponse(result: ModerationResult | null): ModerationResponse {
  if (!result) {
    return {
      flagged: false,
      error: 'Moderation check failed',
      details: {
        message: 'Unable to verify content. Please try again later.'
      }
    };
  }

  if (result.flagged) {
    const categories = result.categories;
    const violationTypes = Object.entries(categories)
      .filter(([, value]) => value)
      .map(([key]) => key.replace(/_/g, ' '))
      .join(', ');

    let message = 'Your content was flagged for containing inappropriate content';
    if (result.details.containsProfanity) {
      message = 'Your content was flagged for containing profanity';
    } else if (violationTypes) {
      message += ` (${violationTypes})`;
    }
    message += '. Please revise your content to meet our community guidelines.';

    return {
      flagged: true,
      score: result.score,
      details: {
        message,
        highRiskContent: result.details.highRiskContent,
        mediumRiskContent: result.details.mediumRiskContent,
        lowRiskContent: result.details.lowRiskContent,
        containsProfanity: result.details.containsProfanity,
        categories: Object.keys(result.categories).filter(key => result.categories[key as keyof typeof result.categories])
      }
    };
  }

  return {
    flagged: false,
    score: result.score
  };
} 