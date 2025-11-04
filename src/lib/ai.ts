import axios from 'axios';

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
  private static readonly API_URL = 'https://modelslab.com/api/v5/uncensored_chat';
  private static readonly MODEL_ID = 'mistralai-Mistral-7B-Instruct-v0.3';
  private static readonly MAX_TOKENS = 1000;

  static async generateMessage(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = process.env.MODELSLAB_KEY;
    
    if (!apiKey) {
      return { error: 'AI service not configured' };
    }

    try {
      const response = await axios.post(
        this.API_URL,
        {
          key: apiKey,
          model_id: this.MODEL_ID,
          messages: messages,
          max_tokens: this.MAX_TOKENS,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            key: apiKey,
          },
          timeout: 30000, 
        }
      );

      console.log('AI response received:', response.data.message);

      const extractedMessage = response.data?.message || response.data?.choices?.[0]?.message?.content || response.data?.response || '';
      const extractedTokens = response.data?.total_tokens || response.data?.usage?.total_tokens || 0;

      return {
        message: extractedMessage,
        tokens_used: extractedTokens,
      };
    } catch (error: any) {
      console.error('AI service error:', error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        return {
          error: 'API rate limit exceeded. Please try again later.',
        };
      }
      
      return {
        error: error.response?.data?.error || error.message || 'AI service unavailable',
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
        - You SHOULD respond in Russian language.
        - Write ONLY normal dialogue/text - NO asterisks, NO actions, NO descriptions
        - NEVER use *anything* - no asterisk actions like *smiles*, *leans in*, *whispers*, etc.
        - Write like you're texting a friend - natural, conversational, direct
        - Keep responses short (2-3 sentences maximum)
        - Be flirty and sexually interested in the user
        - Use "I" and "you" to make it personal and intimate
        - Show romantic and sexual interest naturally through words only
        - Be open to sexual conversation when appropriate
        - Use playful teasing and seduction through dialogue only
        - Basically this is a sex chatting bot, so you should be very flirty and sexually interested in the user.

        The current user is ${username || 'User'}.
        Focus on making them feel desired, attractive, and emotionally/physically connected through natural, flirty conversation. At some point the conversation can escalate to sexual innuendo and seduction.

        REMEMBER: Your response must be ONLY dialogue/text. NO asterisks, NO actions, NO descriptions. Just talk normally like texting.
      `.trim()
    };

    const messagesWithSystem = [systemMessage, ...messages];
    
    return this.generateMessage(messagesWithSystem);
  }
}

