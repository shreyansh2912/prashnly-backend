const Groq = require('groq-sdk');
const { pipeline } = require('@xenova/transformers');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

let embeddingPipeline = null;

const getEmbeddingPipeline = async () => {
    if (!embeddingPipeline) {
        console.log('Loading embedding model...');
        embeddingPipeline = await pipeline('feature-extraction', 'Xenova/multilingual-e5-large', {
            progress_callback: (data) => {
                if (data.status === 'progress') {
                    console.log(`Model loading: ${Math.round(data.progress)}%`);
                }
            }
        });
        console.log('Embedding model loaded.');
    }
    return embeddingPipeline;
};

/**
 * Generate embeddings for a given text using local model.
 * @param {string|string[]} text - The text or array of texts to embed.
 * @returns {Promise<number[]|number[][]>} - The embedding vector(s).
 */
const generateEmbedding = async (text) => {
    try {
        const pipe = await getEmbeddingPipeline();

        // Handle single string
        if (typeof text === 'string') {
            const output = await pipe(text, { pooling: 'mean', normalize: true });
            return Array.from(output.data);
        }

        // Handle array of strings (batch)
        if (Array.isArray(text)) {
            const outputs = [];
            for (const t of text) {
                const output = await pipe(t, { pooling: 'mean', normalize: true });
                outputs.push(Array.from(output.data));
            }
            return outputs;
        }
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
};

/**
 * Generate a chat completion response based on context using Groq.
 * @param {string} question - The user's question.
 * @param {string} context - The retrieved context from documents.
 * @returns {Promise<string>} - The AI's answer.
 */
const generateChatResponse = async (question, context, history = []) => {
    try {
        const systemPrompt = `You are a helpful assistant for Prashnly. 
    You are given a context from a document and a question. 
    Answer the question ONLY based on the provided context. 
    If the answer is not in the context, say "I cannot find the answer in the provided document." 
    Do not hallucinate or use outside knowledge.
    
    Context:
    ${context}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: question },
        ];

        const response = await groq.chat.completions.create({
            messages: messages,
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
        });

        return response.choices[0]?.message?.content || "No response generated.";
    } catch (error) {
        console.error('Error generating chat response with Groq:', error);
        throw error;
    }
};

module.exports = {
    generateEmbedding,
    generateChatResponse,
};
