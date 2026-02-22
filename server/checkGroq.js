require('dotenv').config();
const axios = require('axios');

async function testGroq() {
    const apiKey = process.env.GROQ_API_KEY;
    console.log('API Key present:', !!apiKey);
    if (!apiKey) return;

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'Hello' }],
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Groq Response:', response.data.choices[0].message.content);
    } catch (err) {
        console.error('Groq Error:', err.response?.data || err.message);
    }
}

testGroq();
