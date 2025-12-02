const axios = require('axios');
const API_KEY = "YOUR_ACTUAL_KEY_HERE"; // PASTE IT HERE
const SYMBOL = 'AAPL'; // Use Apple, it is always free

async function testFetch() {
    console.log(`[TEST] Fetching history for ${SYMBOL}...`);
    try {
        // Try the STANDARD URL first
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${SYMBOL}&resolution=D&from=1690000000&to=1700000000&token=${API_KEY}`;
        
        console.log("Trying URL:", url); // Click this link in your terminal to see the error in browser!
        
        const response = await axios.get(url);
        console.log("Response:", response.data);
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.error("Status:", error.response.status);
    }
}
testFetch();