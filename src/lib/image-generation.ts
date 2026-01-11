import axios from 'axios';
import { imageGenerationCircuitBreaker } from './circuit-breaker';

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
}

export interface ImageGenerationResponse {
  status: 'success' | 'processing' | 'error';
  output?: string[];
  error?: string;
  eta?: number;
  fetch_result?: string;
}

interface GrokImageGenerationResponse {
  data: Array<{
    url: string;
  }>;
}

export class ImageGenerationService {
  private static readonly DEFAULT_MODEL = 'grok-2-image';
  private static readonly API_ENDPOINT = 'https://api.x.ai/v1/images/generations';

  private static getApiKey(): string {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }
    return apiKey;
  }

  static async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const apiKey = this.getApiKey();
      
      console.log('Sending image generation request to Grok API');
      
      const response = await imageGenerationCircuitBreaker.execute(async () => {
        const result = await axios.post<GrokImageGenerationResponse>(
          this.API_ENDPOINT,
          {
            model: request.model || this.DEFAULT_MODEL,
            // prompt: request.prompt,
            prompt: "R3alisticF, A sophisticated woman with long, flowing auburn hair, piercing green eyes, and an elegant bone structure. She has a refined, intellectual beauty with subtle freckles across her nose. She has a warm, inviting smile that conveys both intelligence and approachability., Emanuelle, beautiful, detailed, high quality, professional photography, consistent character, same person. Elegant woman modeling high-fashion lingerie, soft studio lighting, tasteful pose, detailed lace, professional fashion photography, cinematic atmosphere, soft shadows, refined and artistic aesthetic."
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 60 seconds timeout
          }
        );
        return result.data;
      });


      if (response.data && response.data.length > 0 && response.data[0].url) {
        return {
          status: 'success',
          output: [response.data[0].url]
        };
      } else {
        return {
          status: 'error',
          error: 'No image URL in response'
        };
      }

    } catch (error: any) {
      console.error('Image generation service error:', error.message);
      
      if (error.message?.includes('Circuit breaker is OPEN')) {
        return {
          status: 'error',
          error: 'Image generation service is temporarily unavailable. Please try again later.'
        };
      }
      
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        return {
          status: 'error',
          error: 'Image generation request timed out. Please try again.'
        };
      }
      
      if (error.response?.status === 429 || error.message?.includes('rate limit')) {
        return {
          status: 'error',
          error: 'API rate limit exceeded. Please try again later.'
        };
      }

      if (error.response?.status === 401) {
        return {
          status: 'error',
          error: 'Invalid API key. Please check your XAI_API_KEY configuration.'
        };
      }
      
      return {
        status: 'error',
        error: error.response?.data?.error?.message || error.message || 'Image generation service unavailable'
      };
    }
  }

  static async generateCompanionImage(
    companionName: string,
    companionDescription: string,
    visualAppearance?: string,
    imageSeed?: string,
    userPrompt?: string
  ): Promise<ImageGenerationResponse> {
    const visualPrompt = visualAppearance || companionDescription;
    
    const basePrompt = `R3alisticF, ${visualPrompt}, ${companionName}, beautiful, detailed, high quality, professional photography, consistent character, same person. Elegant woman modeling high-fashion lingerie, soft studio lighting, tasteful pose, detailed lace, professional fashion photography, cinematic atmosphere, soft shadows, refined and artistic aesthetic.`;
    const fullPrompt = userPrompt ? `${basePrompt}, ${userPrompt}` : basePrompt;

    console.log("fullPrompt: ", fullPrompt);

    return this.generateImage({
      prompt: fullPrompt,
      model: this.DEFAULT_MODEL,
    });
  }

  static async fetchImageFromUrl(imageUrl: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error fetching image from URL:', error);
      return null;
    }
  }
}
