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

      const response = await fetch(`${this.BASE_URL}${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to send Telegram message:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return null;
    }
  }

  static async sendChatAction(chatId: number, action: 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_voice' | 'upload_voice' | 'upload_document' | 'choose_sticker' | 'find_location' | 'record_video_note' | 'upload_video_note'): Promise<TelegramResponse | null> {
    if (!this.botToken) {
      console.error('TELEGRAM_BOT_KEY not found in environment variables');
      return null;
    }

    try {
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

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to send chat action:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error) {
      console.error('Error sending chat action:', error);
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

      const response = await fetch(`${this.BASE_URL}${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to answer callback query:', data);
        return { ok: false, error_code: data.error_code, description: data.description };
      }

      return data;
    } catch (error) {
      console.error('Error answering callback query:', error);
      return null;
    }
  }
}

