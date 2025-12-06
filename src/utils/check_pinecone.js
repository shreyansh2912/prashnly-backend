const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'prashnly';

async function checkPinecone() {
    try {
        console.log('Checking Pinecone connection...');
        if (!PINECONE_API_KEY) {
            throw new Error('PINECONE_API_KEY is missing in .env');
        }

        const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
        const index = pinecone.index(PINECONE_INDEX_NAME);

        console.log(`Fetching stats for index: ${PINECONE_INDEX_NAME}`);
        const stats = await index.describeIndexStats();

        console.log('Index Stats:', JSON.stringify(stats, null, 2));

        if (stats.dimension !== 1024) {
            console.warn(`WARNING: Index dimension is ${stats.dimension}, but we expect 1024.`);
        } else {
            console.log('SUCCESS: Index dimension is 1024.');
        }

    } catch (error) {
        console.error('Error checking Pinecone:', error);
    }
}

checkPinecone();
