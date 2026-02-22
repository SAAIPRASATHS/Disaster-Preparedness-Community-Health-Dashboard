const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Call Groq LLM for AI-enhanced analysis.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {string} AI response text
 */
async function askGroq(systemPrompt, userPrompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    try {
        const { data } = await axios.post(
            GROQ_URL,
            {
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.4,
                max_tokens: 1024,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );

        return data.choices?.[0]?.message?.content || null;
    } catch (err) {
        console.error('Groq API error:', err.response?.data?.error?.message || err.message);
        return null;
    }
}

/**
 * Generate AI-enhanced preparedness advice for a given disaster + family profile.
 */
async function enhancePreparedness({ disasterType, familyMembers, elderly, children, conditions }) {
    const prompt = `A ${disasterType} risk has been detected. The household has ${familyMembers} members, ${elderly} elderly persons, ${children} children. Medical conditions: ${conditions.length ? conditions.join(', ') : 'none'}.

Generate 5 highly specific, actionable preparedness steps. Each step must include quantities, timelines, or specific actions. Do NOT give generic advice. Format as a JSON array of strings.`;

    const response = await askGroq(
        'You are an emergency disaster preparedness expert. Respond ONLY with a JSON array of strings. No other text.',
        prompt
    );

    if (!response) return null;

    try {
        // Extract JSON array from response
        const match = response.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : null;
    } catch {
        return null;
    }
}

/**
 * Generate AI-enhanced outbreak analysis briefing.
 */
async function enhanceOutbreakAnalysis(clusters) {
    if (!clusters.length) return null;

    const summary = clusters
        .map(
            (c) =>
                `Area: ${c.area}, Disease: ${c.predictedDiseaseType}, Confidence: ${(c.confidence * 100).toFixed(0)}%, Reports: ${c.totalReports}, Symptoms: ${JSON.stringify(c.symptomCounts)}`
        )
        .join('\n');

    const response = await askGroq(
        'You are a public health authority advisor. Respond ONLY with a JSON object containing: { "briefing": "...", "priorityActions": ["..."], "riskSummary": "..." }. No other text.',
        `Analyse these outbreak clusters and provide an authority briefing:\n${summary}`
    );

    if (!response) return null;

    try {
        const match = response.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
    } catch {
        return null;
    }
}

module.exports = { askGroq, enhancePreparedness, enhanceOutbreakAnalysis };
