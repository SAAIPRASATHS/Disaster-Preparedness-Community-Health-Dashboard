const router = require('express').Router();
const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

router.post('/', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server' });
        }

        const response = await axios.post(
            GROQ_API_URL,
            {
                model: 'mixtral-8x7b-32768',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a disaster preparedness and community health assistant. Help users with information about emergency procedures, risk assessment, and dashboard features. Keep responses concise and helpful.',
                    },
                    ...messages,
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        res.json(response.data.choices[0].message);
    } catch (err) {
        console.error('Groq Chat Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to communicate with Groq AI' });
    }
});

module.exports = router;
