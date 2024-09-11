require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Telegram setup
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(botToken, { polling: true });

// Binance API endpoints
const binanceApiUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=AVAXUSDT';
const binance24hrStatsUrl = 'https://api.binance.com/api/v3/ticker/24hr?symbol=AVAXUSDT';

const formatNumber = (number, fixedDecimal = 2) => {
    return parseFloat(number).toFixed(fixedDecimal).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const fetchPriceAndSendToTelegram = async () => {
    try {
        // Fetch current price
        const priceResponse = await axios.get(binanceApiUrl);
        const price = formatNumber(priceResponse.data.price);

        // Fetch 24hr statistics
        const statsResponse = await axios.get(binance24hrStatsUrl);
        const { priceChangePercent, highPrice, lowPrice, quoteVolume } = statsResponse.data;

        // Construct formatted message
        let message = '====================\n';
        message += `🔺*AVAX/USDT Price*: \`$${price}\`\n`;
        message += `⏳*24hr Change*: \`${formatNumber(priceChangePercent, 3)}%\`\n`;
        message += `📈*24hr High*: \`$${formatNumber(highPrice)}\`\n`;
        message += `📉*24hr Low*: \`$${formatNumber(lowPrice)}\`\n`;
        message += `💰*24hr Trading Volume*: \`$${formatNumber(quoteVolume, 0)}\`\n`;
        message += '====================';

        // Send message to Telegram
        try {
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (telegramError) {
            // Handle Telegram rate limit error
            if (telegramError.response && telegramError.response.statusCode === 429) {
                const retryAfter = telegramError.response.parameters.retry_after;
                console.error(`Rate limit hit, retrying after ${retryAfter} seconds.`);
                setTimeout(fetchPriceAndSendToTelegram, retryAfter * 1000);
            } else {
                console.error('Error sending message to Telegram:', telegramError);
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

// Fetch price and send update every half minute (30000 milliseconds)
setInterval(fetchPriceAndSendToTelegram, 30000);