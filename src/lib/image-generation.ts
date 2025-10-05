import axios from 'axios';

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
}

export interface ImageGenerationResponse {
  status: 'success' | 'processing' | 'error';
  output?: string[];
  error?: string;
  eta?: number;
  fetch_result?: string;
}

export class ImageGenerationService {
  private static readonly API_URL = 'https://modelslab.com/api/v6/images/text2img';
  private static readonly DEFAULT_MODEL_ID = 'fluxdev';
  private static readonly DEFAULT_LORA_MODEL = 'nobody5femaleuncensoredflux1d-v10';
  private static readonly DEFAULT_NEGATIVE_PROMPT = '(worst quality:2), (low quality:2), (normal quality:2), (jpeg artifacts), (blurry), (duplicate), (morbid), (mutilated), (out of frame), (extra limbs), (bad anatomy), (disfigured), (deformed), (cross-eye), (glitch), (oversaturated), (overexposed), (underexposed), (bad proportions), (bad hands), (bad feet), (cloned face), (long neck), (missing arms), (missing legs), (extra fingers), (fused fingers), (poorly drawn hands), (poorly drawn face), (mutation), (deformed eyes), watermark, text, logo, signature, grainy, tiling, censored, nsfw, ugly, blurry eyes, noisy image, bad lighting, unnatural skin, asymmetry';

  static async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const apiKey = process.env.MODELSLAB_KEY;
    
    if (!apiKey) {
      return { status: 'error', error: 'Image generation service not configured' };
    }

    try {
      const requestBody = {
        prompt: request.prompt,
        model_id: request.model_id || this.DEFAULT_MODEL_ID,
        lora_model: request.lora_model || this.DEFAULT_LORA_MODEL,
        width: request.width || "1024",
        height: request.height || "1024",
        negative_prompt: request.negative_prompt || this.DEFAULT_NEGATIVE_PROMPT,
        num_inference_steps: request.num_inference_steps || "31",
        scheduler: request.scheduler || "DPMSolverMultistepScheduler",
        guidance_scale: request.guidance_scale || "7.5",
        enhance_prompt: request.enhance_prompt || false,
        key: apiKey
      };

      console.log('Sending image generation request to ModelsLab API');
      
      const response = await axios.post(
        this.API_URL,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      console.log('Image generation response received:', response.data);

      if (response.data.status === 'success' && response.data.output) {
        return {
          status: 'success',
          output: response.data.output
        };
      } else if (response.data.status === 'processing') {
        return {
          status: 'processing',
          eta: response.data.eta,
          fetch_result: response.data.fetch_result
        };
      } else {
        return {
          status: 'error',
          error: response.data.message || 'Unknown error occurred'
        };
      }

    } catch (error: any) {
      console.error('Image generation service error:', error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        return {
          status: 'error',
          error: 'API rate limit exceeded. Please try again later.'
        };
      }
      
      return {
        status: 'error',
        error: error.response?.data?.error || error.message || 'Image generation service unavailable'
      };
    }
  }

  static async generateCompanionImage(
    companionName: string,
    companionDescription: string,
    userPrompt?: string
  ): Promise<ImageGenerationResponse> {
    const basePrompt = `R3alisticF, ${companionDescription}, ${companionName}, beautiful, detailed, high quality, professional photography`;
    const fullPrompt = userPrompt ? `${basePrompt}, ${userPrompt}` : basePrompt;

    return this.generateImage({
      prompt: fullPrompt,
      model_id: this.DEFAULT_MODEL_ID,
      lora_model: this.DEFAULT_LORA_MODEL,
      width: "1024",
      height: "1024",
      negative_prompt: this.DEFAULT_NEGATIVE_PROMPT,
      num_inference_steps: "31",
      scheduler: "DPMSolverMultistepScheduler",
      guidance_scale: "7.5",
      enhance_prompt: false
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
