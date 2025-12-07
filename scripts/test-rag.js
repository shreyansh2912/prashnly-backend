require('dotenv').config();
const vectorStore = require('../src/utils/vectorStore');
const { generateEmbedding, generateChatResponse } = require('../src/utils/ai');

const runTest = async () => {

    try {
        // 1. Test Embedding
        const text = "Prashnly is an AI-powered FAQ assistant that helps you chat with your documents.";
        const embedding = await generateEmbedding(text);

        // 2. Test Vector Store (Pinecone)
        const testId = 'test-doc-1';
        await vectorStore.addDocuments([{
            id: testId,
            text: text,
            embedding: embedding,
            metadata: { test: 'true', documentId: 'test-doc' }
        }]);

        // Pinecone is eventually consistent, wait a bit
        await new Promise(r => setTimeout(r, 10000));

        // 3. Test Query
        const results = await vectorStore.query(embedding, { test: 'true' }, 1);

        if (results.length > 0 && results[0].content === text) {
            console.log('Vector Store verification PASSED.');
        } else {
            console.error('Vector Store verification FAILED (or data not yet consistent).');
        }

        // 4. Test Groq Chat
        const question = "What is Prashnly?";
        const answer = await generateChatResponse(question, text);

        if (!answer) {
            console.error('Groq verification FAILED.');
        }

        await vectorStore.deleteDocuments({ test: 'true' });
    } catch (error) {
        console.error('Test Failed:', error);
    }
};

runTest();
