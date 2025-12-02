// backend/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- FIX: Import Class and Instantiate it ---
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance(); 

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- HELPER: Date Formatter ---
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 2. UPDATED: Gemini acting as Manager (Now with Native JSON Mode)
async function getGeminiInsight(symbol, technicalAnalysis, newsHeadlines, price) {
    if (!GEMINI_API_KEY) return { decision: "HOLD", reason: "• AI Key Missing" };
    
    try {
        const prompt = `
            Role: Senior Portfolio Manager.
            Task: Make a trading decision for ${symbol} (Current Price: $${price}).
            
            INPUT DATA:
            1. QUANTITATIVE ANALYSIS:
            ${technicalAnalysis}
            
            2. MARKET SENTIMENT (News):
            ${newsHeadlines}
            
            INSTRUCTIONS:
            - Weigh the "Hard Math" (SMA, RSI) against the "Soft News".
            - If RSI is > 70 (Overbought) BUT news is incredibly positive, you might HOLD.
            - If RSI is < 30 (Oversold) and news is bad, you might still SELL.
            
            OUTPUT SCHEMA:
            Return a JSON object with exactly these two fields:
            - decision: "BUY", "SELL", or "HOLD"
            - reason: A single string containing exactly 4 bullet points separated by newlines (\n). Start each bullet with "• ".
        `;
        
        // CRITICAL FIX: explicit generationConfig requesting JSON
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" } 
        });

        const response = result.response;
        const text = response.text();

        // Native JSON mode usually doesn't add markdown blocks, but we clean just in case
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Gemini Error:", error.message);
        // If JSON parse fails or API errors, return safe fallback
        return { 
            decision: "HOLD", 
            reason: "• AI analysis temporarily unavailable.\n• Review manual indicators.\n• Check news feed manually.\n• Monitor volatility." 
        };
    }
}

// --- ROUTES ---

app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get(`https://finnhub.io/api/v1/search`, { params: { q: query, token: FINNHUB_TOKEN } });
    res.json(response.data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/quote', async (req, res) => {
  try {
    const symbol = req.query.symbol.toUpperCase();
    const response = await axios.get(`https://finnhub.io/api/v1/quote`, { params: { symbol, token: FINNHUB_TOKEN } });
    res.json(response.data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/profile', async (req, res) => {
  try {
    const symbol = req.query.symbol.toUpperCase();
    const response = await axios.get(`https://finnhub.io/api/v1/stock/profile2`, { params: { symbol, token: FINNHUB_TOKEN } });
    res.json(response.data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

const STRATEGY_SERVICE_URL = 'http://127.0.0.1:8080/analyze';

app.get('/api/signal', async (req, res) => {
  try {
    const { symbol } = req.query;
    let closePrices = [];
    let headlines = "No specific news found.";

    // 1. Get Real Data (Prices via Yahoo, News via Finnhub)
    try {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - 60); 

        const queryOptions = { 
            period1: pastDate, 
            period2: today, 
            interval: '1d' 
        };
        
        // A. Fetch Prices (Yahoo is good for this)
        const result = await yahooFinance.chart(symbol, queryOptions);
        const historical = result.quotes; 
        
        if (historical && historical.length > 0) {
            closePrices = historical.map(c => c.close).filter(p => p !== null);
        } else { throw new Error("Empty history"); }

        // B. Fetch News (UPDATED: Using Finnhub instead of Yahoo Search)
        // Finnhub requires YYYY-MM-DD format
        const toDate = today.toISOString().split('T')[0]; 
        const fromDateObj = new Date();
        fromDateObj.setDate(today.getDate() - 7); // Last 7 days of news
        const fromDate = fromDateObj.toISOString().split('T')[0];

        try {
            const newsUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_TOKEN}`;
            const newsRes = await axios.get(newsUrl);
            
            // Finnhub returns an array of objects. We take the top 5.
            if (newsRes.data && newsRes.data.length > 0) {
                headlines = newsRes.data
                    .slice(0, 5) // Limit to top 5 stories
                    .map(n => `- ${n.headline}`) // Finnhub uses 'headline', not 'title'
                    .join("\n");
            }
        } catch (newsErr) {
            console.warn("Finnhub News Error:", newsErr.message);
            // Fallback: headlines remains "No specific news found."
        }

    } catch (e) {
        console.warn(`Data fetch failed for ${symbol}: ${e.message}`);
        return res.json({ 
            symbol, 
            signal: "UNKNOWN", 
            insight: "• Unable to fetch market data.",
            note: "Data Error"
        });
    }

    // 2. Get C++ Quantitative Analysis
    let techAnalysisString = "Technical data unavailable.";
    try {
        const stratRes = await axios.post(STRATEGY_SERVICE_URL, { prices: closePrices });
        if (stratRes.data && stratRes.data.technical_analysis) {
            techAnalysisString = stratRes.data.technical_analysis;
        }
    } catch (e) {
        techAnalysisString = "C++ Quantitative Engine is offline. Proceeding with News only.";
    }

    // 3. Get AI Decision (Hybrid Intelligence)
    const currentPrice = closePrices[closePrices.length - 1];
    
    // Pass the C++ Text + News to Gemini
    const aiResult = await getGeminiInsight(symbol, techAnalysisString, headlines, currentPrice);

    res.json({
        symbol,
        signal: aiResult.decision,   
        insight: aiResult.reason,    
        note: "Quant + GenAI"
    });

  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});