import axios from 'axios';
// @ts-ignore
import { Client, Community } from 'modelslab';

export interface ImageGenerationRequest {
  prompt: string;
  model_id?: string;
  lora_model?: string;
  width?: string;
  height?: string;
  negative_prompt?: string;
  num_inference_steps?: string;
  scheduler?: string;
  guidance_scale?: string;
  enhance_prompt?: boolean;
  seed?: string;
}

export interface ImageGenerationResponse {
  status: 'success' | 'processing' | 'error';
  output?: string[];
  error?: string;
  eta?: number;
  fetch_result?: string;
}

export class ImageGenerationService {
  private static readonly DEFAULT_MODEL_ID = 'fluxdev';
  private static readonly DEFAULT_LORA_MODEL = 'nobody5femaleuncensoredflux1d-v10';
  private static readonly DEFAULT_NEGATIVE_PROMPT = '(worst quality:2), (low quality:2), (normal quality:2), (jpeg artifacts), (blurry), (duplicate), (morbid), (mutilated), (out of frame), (extra limbs), (bad anatomy), (disfigured), (deformed), (cross-eye), (glitch), (oversaturated), (overexposed), (underexposed), (bad proportions), (bad hands), (bad feet), (cloned face), (long neck), (missing arms), (missing legs), (extra fingers), (fused fingers), (poorly drawn hands), (poorly drawn face), (mutation), (deformed eyes), watermark, text, logo, signature, grainy, tiling, censored, nsfw, ugly, blurry eyes, noisy image, bad lighting, unnatural skin, asymmetry';

  private static getClient(): Client {
    const apiKey = process.env.MODELSLAB_KEY;
    if (!apiKey) {
      throw new Error('MODELSLAB_KEY environment variable is not set');
    }
    return new Client(apiKey);
  }

  private static getCommunity(): Community {
    const apiKey = process.env.MODELSLAB_KEY;
    if (!apiKey) {
      throw new Error('MODELSLAB_KEY environment variable is not set');
    }
    return new Community(apiKey);
  }

  static async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const community = this.getCommunity();
      const client = this.getClient();
      
      console.log('Sending image generation request to ModelsLab API');
      
      const response = await community.textToImage({
        key: client.key,
        prompt: request.prompt,
        model_id: request.model_id || this.DEFAULT_MODEL_ID,
        lora_model: request.lora_model || this.DEFAULT_LORA_MODEL,
        width: parseInt(request.width || "1024"),
        height: parseInt(request.height || "1024"),
        negative_prompt: request.negative_prompt || this.DEFAULT_NEGATIVE_PROMPT,
        num_inference_steps: parseInt(request.num_inference_steps || "28"),
        scheduler: request.scheduler || "DPMSolverMultistepScheduler",
        guidance_scale: parseFloat(request.guidance_scale || "5"),
        enhance_prompt: request.enhance_prompt || false,
        seed: request.seed ? parseInt(request.seed) : undefined
      });

      console.log('Image generation response received:', response);

      if (response.status === 'success' && response.output) {
        return {
          status: 'success',
          output: response.output
        };
      } else if (response.status === 'processing') {
        return {
          status: 'processing',
          eta: response.eta,
          fetch_result: response.fetch_result
        };
      } else {
        return {
          status: 'error',
          error: response.message || 'Unknown error occurred'
        };
      }

    } catch (error: any) {
      console.error('Image generation service error:', error.message);
      
      if (error.message?.includes('rate limit')) {
        return {
          status: 'error',
          error: 'API rate limit exceeded. Please try again later.'
        };
      }
      
      return {
        status: 'error',
        error: error.message || 'Image generation service unavailable'
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
    
    const basePrompt = `R3alisticF, ${visualPrompt}, ${companionName}, beautiful, detailed, high quality, professional photography, consistent character, same person`;
    const fullPrompt = userPrompt ? `${basePrompt}, ${userPrompt}` : basePrompt;

    return this.generateImage({
      prompt: fullPrompt,
      model_id: this.DEFAULT_MODEL_ID,
      lora_model: this.DEFAULT_LORA_MODEL,
      width: "1024",
      height: "1024",
      negative_prompt: this.DEFAULT_NEGATIVE_PROMPT,
      num_inference_steps: "28",
      scheduler: "DPMSolverMultistepScheduler",
      guidance_scale: "5",
      enhance_prompt: false,
      seed: imageSeed
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

  static async pollForImageCompletion(fetchUrl: string): Promise<ImageGenerationResponse> {
    console.log(`Starting to poll for image completion: ${fetchUrl}`);
    
    try {
      const community = this.getCommunity();
      
      const urlParts = fetchUrl.split('/');
      const requestId = urlParts[urlParts.length - 1];
      
      console.log(`Using SDK built-in fetch method for request ID: ${requestId}`);
      
      const response = await community.fetch(requestId);

      console.log('SDK fetch response:', response);

      if (response.status === 'success' && response.output && response.output.length > 0) {
        console.log('Image generation completed successfully using SDK fetch!');
        return {
          status: 'success',
          output: response.output
        };
      } else if (response.status === 'error') {
        return {
          status: 'error',
          error: response.message || 'Image generation failed'
        };
      } else {
        return {
          status: 'error',
          error: 'Unexpected response status from SDK fetch'
        };
      }
    } catch (error: any) {
      console.error('Error using SDK fetch method:', error.message);
      return {
        status: 'error',
        error: `Failed to fetch image completion: ${error.message}`
      };
    }
  }
}
