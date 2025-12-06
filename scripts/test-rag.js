require('dotenv').config();
const vectorStore = require('../src/utils/vectorStore');
const { generateEmbedding, generateChatResponse } = require('../src/utils/ai');

const runTest = async () => {
    console.log('Starting RAG Test (Pinecone)...');

    try {
        // 1. Test Embedding
        console.log('Generating Embedding...');
        const text = "Prashnly is an AI-powered FAQ assistant that helps you chat with your documents.";
        const embedding = await generateEmbedding(text);
        console.log('Embedding generated. Length:', embedding.length);

        // 2. Test Vector Store (Pinecone)
        console.log('Testing Pinecone Upsert...');
        const testId = 'test-doc-1';
        await vectorStore.addDocuments([{
            id: testId,
            text: text,
            embedding: embedding,
            metadata: { test: 'true', documentId: 'test-doc' }
        }]);
        console.log('Document added to Pinecone. Waiting 10s for consistency...');

        // Pinecone is eventually consistent, wait a bit
        await new Promise(r => setTimeout(r, 10000));

        // 3. Test Query
        console.log('Testing Query...');
        const results = await vectorStore.query(embedding, { test: 'true' }, 1);
        console.log('Query Results:', results);

        if (results.length > 0 && results[0].content === text) {
            console.log('Vector Store verification PASSED.');
        } else {
            console.error('Vector Store verification FAILED (or data not yet consistent).');
        }

        // 4. Test Groq Chat
        console.log('Testing Groq Chat...');
        const question = "What is Prashnly?";
        const answer = await generateChatResponse(question, text);
        console.log('Groq Answer:', answer);

        if (answer) {
            console.log('Groq verification PASSED.');
        } else {
            console.error('Groq verification FAILED.');
        }

        // Cleanup
        console.log('Cleaning up...');
        await vectorStore.deleteDocuments({ test: 'true' });
        console.log('Cleanup done.');

    } catch (error) {
        console.error('Test Failed:', error);
    }
};

runTest();
