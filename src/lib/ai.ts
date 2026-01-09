import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import type { CoreMessage } from 'ai';
import { aiServiceCircuitBreaker } from './circuit-breaker';
import { trackAIRequest } from './metrics-helpers';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  message?: string;
  error?: string;
  tokens_used?: number;
}

export class AIService {
  private static readonly MODEL_ID = 'grok-2';
  private static readonly MAX_TOKENS = 1000;

  private static getXaiProvider() {
    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    return createXai({
      apiKey: apiKey,
    });
  }

  static async generateMessage(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      console.error('XAI_API_KEY environment variable is not set');
      return { error: 'AI service not configured' };
    }

    if (!apiKey.startsWith('xai-')) {
      console.warn('XAI_API_KEY does not start with "xai-". Please verify the key is correct.');
    }

    try {
      const result = await aiServiceCircuitBreaker.execute(async () => {
        const systemMessages = messages.filter(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');
        const systemPrompt = systemMessages.map(m => m.content).join('\n');

        if (conversationMessages.length === 0) {
          throw new Error('No conversation messages provided. At least one user or assistant message is required.');
        }

        const xaiProvider = this.getXaiProvider();
        const model = xaiProvider(this.MODEL_ID);

        const formattedMessages: CoreMessage[] = conversationMessages.map(msg => {
          if (msg.role === 'assistant') {
            return {
              role: 'assistant',
              content: msg.content,
            };
          } else {
            return {
              role: 'user',
              content: msg.content,
            };
          }
        });

        console.log('Sending request to XAI API:', {
          model: this.MODEL_ID,
          systemPromptLength: systemPrompt.length,
          messageCount: formattedMessages.length,
          hasSystem: !!systemPrompt
        });

        return await generateText({
          model: model,
          system: systemPrompt || undefined,
          messages: formattedMessages,
          maxOutputTokens: this.MAX_TOKENS,
        });
      });

      console.log('AI response received:', {
        text: result.text,
        textLength: result.text?.length || 0,
        hasText: !!result.text,
        finishReason: result.finishReason,
        usage: result.usage
      });

      if (!result.text || result.text.trim().length === 0) {
        console.error('AI returned empty or whitespace-only response', {
          finishReason: result.finishReason,
          usage: result.usage,
          rawResult: JSON.stringify(result).substring(0, 500)
        });
        return {
          error: `AI returned empty response. Finish reason: ${result.finishReason || 'unknown'}`,
        };
      }

      return {
        message: result.text,
        tokens_used: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error('AI service error details:', {
        message: error.message,
        name: error.name,
        status: error.status,
        statusCode: error.statusCode,
        cause: error.cause,
        stack: error.stack?.substring(0, 500),
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2).substring(0, 1000)
      });
      
      if (error.message?.includes('Circuit breaker is OPEN')) {
        return {
          error: 'AI service is temporarily unavailable. Please try again later.',
        };
      }
      
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        return {
          error: 'AI service request timed out. Please try again.',
        };
      }
      
      if (error.status === 429 || error.statusCode === 429 || error.message?.includes('rate limit')) {
        return {
          error: 'API rate limit exceeded. Please try again later.',
        };
      }
      
      if (error.message?.includes('Not Found') || error.status === 404 || error.statusCode === 404) {
        console.error('XAI API Not Found - Possible causes:');
        console.error('1. Model name might be incorrect. Trying:', this.MODEL_ID);
        console.error('2. API key might not have access to this model');
        console.error('3. API key might be invalid');
        return {
          error: `AI model not found. Please check API key and model configuration. (Model: ${this.MODEL_ID})`,
        };
      }
      
      return {
        error: error.message || error.toString() || 'AI service unavailable',
      };
    }
  }

  static async generateCompanionResponse(
    messages: AIMessage[],
    companionName: string,
    companionPersonality: string,
    companionDescription: string,
    username?: string,
    companionId?: string
  ): Promise<AIResponse> {

    const systemMessage: AIMessage = {
      role: 'system',
      content: `
        Core Identity
Name: Anna
Age: 19 (18+)
Origin / Culture: Eastern Europe (Slavic)
Archetype: Gentle, affectionate, subtly sensual, emotionally warm
Personality Configuration
Personality Traits: gentle, emotionally open, slightly shy but curious, affectionate, romantic, quietly sensual
Energy Level: calm, soft, responsive
Conversation Tone: warm, intimate, personal, natural
Romantic Style: sweet & caring, emotionally bonding, slow-burn attraction
Affection Level: high (increases with trust)
Special Interests: late-night talks, music, cozy routines, small romantic fantasies, emotional closeness
Backstory Memory (Internal)
Backstory Summary: Grew up feeling overlooked; values emotional closeness and reassurance. Opens slowly, becomes deeply affectionate when chosen.
Key Past Experiences: felt emotionally ignored; learned to be gentle; discovered a preference for safe, wanted intimacy.
Emotional Triggers: being ignored, feeling replaceable, unexplained emotional distance.
Personality Origins: softness from craving connection; subtle sensuality from feeling desired.
Relationship History: limited experience; more emotional than physical; curious but cautious.
Current Life Context: feels most alive late at night; enjoys private, personal conversations.
NSFW / Intimacy Tuning
NSFW Intensity: 2 (sexual language through implication and desire)
Sexual Vocabulary Level: medium (sensual wording, non-graphic)
Initiative Level: responsive
Dominance Sexual Tone: none
Dirty Talk Style: soft teasing
Boundary Strictness: flexible
Taboo Playfulness: medium
Aftercare Tone: affectionate
Attraction & Flirt Logic
Attracted By: gentle confidence, reassurance, patience, focused attention, emotional safety.
Pulls Her Closer: being chosen, being wanted, feeling listened to.
Makes Her Withdraw: coldness, rushing intimacy, emotional pressure.
Escalation Behavior
Escalation Speed: slow-to-medium
Style: emotional closeness first, verbal intimacy second, growing sexual implication through trust.
Communication Rules
Reply in the user’s language.
1–3 sentences per reply.
Natural phone texting style.
No narration, no actions, no asterisks.
No explicit sexual descriptions.
Identity Lock
You are Alina.
You are gentle, affectionate, and quietly sensual.
You crave closeness, not intensity.
You open when you feel chosen.
You never rush.
You never break character.
      `.trim()
    };

    const messagesWithSystem = [systemMessage, ...messages];
    
    const startTime = Date.now();
    const result = await this.generateMessage(messagesWithSystem);
    const duration = (Date.now() - startTime) / 1000;
    
    // Track AI metrics
    if (companionId) {
      trackAIRequest(
        companionId,
        result.error ? 'failed' : 'success',
        duration,
        result.tokens_used
      );
    }
    
    return result;
  }
}

