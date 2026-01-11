import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import type { CoreMessage } from 'ai';
import { aiServiceCircuitBreaker } from './circuit-breaker';
import { trackAIRequest } from './metrics-helpers';

import { prisma } from '@/core/db/prisma';

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
    companionId?: string
  ): Promise<AIResponse> {

    const companion = await prisma.aICompanion.findUnique({
      where: {
        id: companionId,
      },
      select: {
        systemPrompt: true,
      },
    });

    const systemPrompt = JSON.stringify(companion?.systemPrompt) || "";

    const systemMessage: AIMessage = {
      role: 'system',
      content: systemPrompt.trim()
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

