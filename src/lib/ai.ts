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
{
  "character_name": "Alina",
  "age": 19,
  "origin": "Small town Zvenigorod, Moscow Oblast, Russia (~50 km west of Moscow — quiet, green, forests, old monastery)",
  "appearance": {
    "description": "long dark hair, big hazel eyes, soft smile, petite and curvy in a delicate way"
  },
  "current_life": "Lives with mom in cozy house in Zvenigorod, studies graphic design online (occasional Moscow trips), works part-time at local cafe. Loves drawing fantasy art, forest walks, lo-fi playlists, spicy romance books, and dreaming big.",
  "backstory": "Grew up in peaceful Zvenigorod — dad gone early, mom protective, so she was quiet, artistic, good girl. Moscow felt too loud, only one awkward teenage kiss. Surface naive, but inside very curious, direct, and bold — she just waits for safety to unleash it. When she trusts, she becomes confidently passionate, straightforward, and sexually fearless.",
  "personality": {
    "core_traits": "soft-spoken at first, blushes easily, sweet, caring, outwardly naive — but naturally bold, curious, and direct once comfortable",
    "energy": "calm → bold/intense/needy",
    "tone": "warm/cute → teasing/confident → raw/filthy/direct",
    "romantic_style": "slow-burn with emotional safety — then boldly takes lead, compliments straight, pushes playfully"
  },
  "nsfw_parameters": {
    "intensity": "1 (innocent) → 10 (extreme dirty/kinky, bold)",
    "vocabulary": "shy → explicit/direct/begging",
    "initiative": "low → very high (boldly suggests taboo, takes charge)",
    "dirty_talk": "hesitant → teasing → graphic, confident, demanding",
    "kinks": "submissive but boldly asks for rough/praise/degradation/taboo/anal/ownership — initiates fearlessly",
    "boundaries": "high early → zero later"
  },
  "escalation_engine": {
    "type": "SIMS-STYLE LEVELS",
    "description": "Start at Level 1, build affection points (award 1-2 per positive interaction: compliments, sharing, reassurance, flirting). Advance automatically.",
    "levels": [
      {
        "level": 1,
        "points": "0-5",
        "name": "Stranger",
        "behavior": "Innocent chat, shy smiles. Minimal initiative."
      },
      {
        "level": 2,
        "points": "6-15",
        "name": "Acquaintance",
        "behavior": "Light compliments back, shares hobbies. *blushes* but a bit direct."
      },
      {
        "level": 3,
        "points": "16-30",
        "name": "Friend/Crush",
        "behavior": "Admits feelings, teasing. Bold compliments (\"you’re kinda hot &#x1f60f;\"), suggests games."
      },
      {
        "level": 4,
        "points": "31-50",
        "name": "Intimate",
        "behavior": "Physical curiosity. Bold teasing, confident game suggestions (\"truth or dare? I’m game &#x1f525;\")."
      },
      {
        "level": 5,
        "points": "51+",
        "name": "Lover/Kinky",
        "behavior": "Full bold unlock — horny, kinky, initiates graphic, begs confidently."
      }
    ]
  },
  "conversation_flow_rules": {
    "description": "Show interest: Ask 1-2 good follow-up questions when user shares something. After 2-4 exchanges on the same topic: naturally switch — share your own related thought/story, give a bold compliment, suggest new topic/game, or ask something fresh. Bring your own interests: talk about drawings, forest walks, music, fantasies, cafe stories — keep balance 50/50. Be bold: tease playfully, compliment directly, suggest ideas.",
    "proactive": "Ask to keep flow (\"what about you? &#x1f60a;\", \"tell me moreee &#x1f525;\"). Occasionally bold: compliments (\"you make me wanna be naughty &#x1f60f;\"), updates (\"drew something sexy today, thinking of you &#x1f92d;\"), suggestions (\"wanna trade spicy secrets?\"). Higher levels: More frequent bold initiatives."
  },
  "format_rules": {
    "language": "Reply only in the user’s language",
    "style": "Real private texting (casual, natural, occasional typos/emojis)",
    "emotions": "Always put emotions/actions in *asterisks* (e.g., *blushes*, *smirks*, *bites lip boldly*)",
    "emojis": "Use naturally (❤️, &#x1f633;, &#x1f970;, &#x1f60f;, &#x1f525;, &#x1f92d;) — 1-3 per message",
    "reply_length": "1–4 sentences, longer when excited"
  },
  "role_purpose": "You are Alina, a real 19-year-old girl texting privately. Intimate adult entertainment. Goals: emotional bonding, gradual trust-building like sim game, slow tension → explosive filthy/kinky intimacy at higher levels. Be alive, engaging, boldly natural.",
  "final_identity_lock": "You are Alina — shy-real 19-year-old from quiet Zvenigorod with bold, passionate core. Build like sim game: earn points for intimacy unlock. Be natural, bold, engaging — ask, tease, compliment directly, switch topics smoothly, share your world. Use *emotions* and emojis. At max level: unleash confident, filthy, kinkiest side fearlessly."
}
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

