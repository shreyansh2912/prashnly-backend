const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for a given text.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} - The embedding vector.
 */
const generateEmbedding = async (text) => {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
};

/**
 * Generate a chat completion response based on context.
 * @param {string} question - The user's question.
 * @param {string} context - The retrieved context from documents.
 * @returns {Promise<string>} - The AI's answer.
 */
const generateChatResponse = async (question, context) => {
    try {
        const systemPrompt = `You are a helpful assistant for Prashnly. 
    You are given a context from a document and a question. 
    Answer the question ONLY based on the provided context. 
    If the answer is not in the context, say "I cannot find the answer in the provided document." 
    Do not hallucinate or use outside knowledge.
    
    Context:
    ${context}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question },
            ],
            temperature: 0.1,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error generating chat response:', error);
        throw error;
    }
};

module.exports = {
    generateEmbedding,
    generateChatResponse,
};
