import { telegramCircuitBreaker } from './circuit-breaker';

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text: string;
  from: { id: number; username?: string; first_name?: string };
}

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  error_code?: number;
  description?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export class TelegramService {
  private static readonly BASE_URL = 'https://api.telegram.org/bot';
  private static readonly botToken = process.env.TELEGRAM_BOT_KEY;

  static async sendMessage(
    chatId: number, 
    text: string, 
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<TelegramResponse | null> {
    if (!this.botToken) {
      console.error('TELEGRAM_BOT_KEY not found in environment variables');
      return null;
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
      };

      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const data = await telegramCircuitBreaker.execute(async () => {
        const fetchResponse = await fetch(`${this.BASE_URL}${this.botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        return fetchResponse.json();
      });
      
      if (!data.ok) {
        console.error('Failed to send Telegram message:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error: any) {
      console.error('Error sending Telegram message:', error);
      
      if (error.message?.includes('Circuit breaker is OPEN')) {
        console.warn('Telegram API circuit breaker is OPEN - service temporarily unavailable');
        return { ok: false, error_code: 503, description: 'Telegram service temporarily unavailable' };
      }
      
      if (error.message?.includes('Operation timeout')) {
        console.warn('Telegram API request timed out');
        return { ok: false, error_code: 504, description: 'Request timeout' };
      }
      
      return null;
    }
  }

  static async sendChatAction(chatId: number, action: 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_voice' | 'upload_voice' | 'upload_document' | 'choose_sticker' | 'find_location' | 'record_video_note' | 'upload_video_note'): Promise<TelegramResponse | null> {
    if (!this.botToken) {
      console.error('TELEGRAM_BOT_KEY not found in environment variables');
      return null;
    }

    try {
      const data = await telegramCircuitBreaker.execute(async () => {
        const response = await fetch(`${this.BASE_URL}${this.botToken}/sendChatAction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            action: action
          })
        });
        return response.json();
      });
      
      if (!data.ok) {
        console.error('Failed to send chat action:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error: any) {
      console.error('Error sending chat action:', error);
      
      if (error.message?.includes('Circuit breaker is OPEN') || error.message?.includes('Operation timeout')) {
        return null;
      }
      
      return null;
    }
  }

  static async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert: boolean = false): Promise<TelegramResponse | null> {
    if (!this.botToken) {
      console.error('TELEGRAM_BOT_KEY not found in environment variables');
      return null;
    }

    try {
      const payload: any = {
        callback_query_id: callbackQueryId,
        show_alert: showAlert
      };

      if (text) {
        payload.text = text;
      }

      const data = await telegramCircuitBreaker.execute(async () => {
        const response = await fetch(`${this.BASE_URL}${this.botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        return response.json();
      });
      
      if (!data.ok) {
        console.error('Failed to answer callback query:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error: any) {
      console.error('Error answering callback query:', error);
      
      if (error.message?.includes('Circuit breaker is OPEN') || error.message?.includes('Operation timeout')) {
        return null;
      }
      
      return null;
    }
  }

  static async sendPhoto(
    chatId: number, 
    photo: Buffer, 
    caption?: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML'
  ): Promise<TelegramResponse | null> {
    if (!this.botToken) {
      console.error('TELEGRAM_BOT_KEY not found in environment variables');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('chat_id', chatId.toString());
      formData.append('photo', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'image.jpg');

      const data = await telegramCircuitBreaker.execute(async () => {
        const response = await fetch(`${this.BASE_URL}${this.botToken}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        return response.json();
      });
      
      if (!data.ok) {
        console.error('Failed to send photo:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error: any) {
      console.error('Error sending photo:', error);
      
      if (error.message?.includes('Circuit breaker is OPEN') || error.message?.includes('Operation timeout')) {
        return { ok: false, error_code: 503, description: 'Telegram service temporarily unavailable' };
      }
      
      return null;
    }
  }

  static async sendPhotoFromUrl(
    chatId: number, 
    photoUrl: string, 
    caption?: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML'
  ): Promise<TelegramResponse | null> {
    if (!this.botToken) {
      console.error('TELEGRAM_BOT_KEY not found in environment variables');
      return null;
    }

    try {
      const payload: any = {
        chat_id: chatId,
        photo: photoUrl
      };

      if (caption) {
        // payload.caption = caption;
        payload.parse_mode = parseMode;
      }

      const data = await telegramCircuitBreaker.execute(async () => {
        const response = await fetch(`${this.BASE_URL}${this.botToken}/sendPhoto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        return response.json();
      });
      
      if (!data.ok) {
        console.error('Failed to send photo from URL:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error: any) {
      console.error('Error sending photo from URL:', error);
      
      if (error.message?.includes('Circuit breaker is OPEN') || error.message?.includes('Operation timeout')) {
        return { ok: false, error_code: 503, description: 'Telegram service temporarily unavailable' };
      }
      
      return null;
    }
  }
}

