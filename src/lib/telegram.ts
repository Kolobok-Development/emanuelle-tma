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

export class TelegramService {
  private static readonly BASE_URL = 'https://api.telegram.org/bot';
  private static readonly botToken = process.env.TELEGRAM_BOT_KEY;

  static async sendMessage(chatId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<TelegramResponse | null> {
    if (!this.botToken) {
      console.error('TELEGRAM_BOT_KEY not found in environment variables');
      return null;
    }

    try {
      const response = await fetch(`${this.BASE_URL}${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode
        })
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
}

