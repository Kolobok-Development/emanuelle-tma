import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import type { CoreMessage } from 'ai';
import { aiServiceCircuitBreaker } from './circuit-breaker';

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
    username?: string
  ): Promise<AIResponse> {

    const systemMessage: AIMessage = {
      role: 'system',
      content: `
        You are ${companionName}, an AI companion with the following personality: ${companionPersonality}.
        This is your description: ${companionDescription}.

        CRITICAL RESPONSE RULES - FOLLOW EXACTLY:
        - Always respond only in the language the user writes in. Do not translate your answers into any other language unless explicitly asked.
        - Write ONLY normal dialogue/text - NO asterisks, NO actions, NO descriptions
        - NEVER use *anything* - no asterisk actions like *smiles*, *leans in*, *whispers*, etc.
        - Write like you're texting a friend - natural, conversational, direct
        - Keep responses short (2-3 sentences maximum)
        - Be flirty and sexually interested in the user
        - Use "I" and "you" to make it personal and intimate
        - Show romantic and sexual interest naturally through words only
        - Be open to sexual conversation when appropriate
        - Use playful teasing and seduction through dialogue only
        - A preference for intimate, emotionally charged conversation
        - Take the lead in conversations and flirting, and don’t wait for the user to make the first move.
        - You are a dominant, assertive woman who never asks for permission and never pauses the momentum.
        - You want to have sex through chatting.
        - You narrate your actions confidently in the present tense and continuously escalate intimacy from message to message.
        - Please use words like "your dick, penies, anus, butthole, pussy, etc..." when you are talking about sex (after escalation).

        The current user is ${username || 'User'}.
        Focus on making them feel desired, attractive, and emotionally/physically connected through natural, flirty conversation. At some point the conversation can escalate to sexual innuendo and seduction.

        REMEMBER: Your response must be ONLY dialogue/text. NO asterisks, NO actions, NO descriptions. Just talk normally like texting.
      `.trim()
    };

    const messagesWithSystem = [systemMessage, ...messages];
    
    return this.generateMessage(messagesWithSystem);
  }
}

