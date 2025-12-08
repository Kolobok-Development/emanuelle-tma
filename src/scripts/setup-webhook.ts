import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`


async function setupWebhook() {
    // Delete old webhook
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`)
    
    // Set new webhook
    const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: WEBHOOK_URL,
                allowed_updates: ['message', 'pre_checkout_query']
            })
        }
    )
    
    const data = await response.json()
    console.log('Webhook setup:', data.ok ? '✅ Success' : '❌ Failed')
}

setupWebhook()