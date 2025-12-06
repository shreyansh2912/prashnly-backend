const { generateEmbedding } = require('./ai');

async function testEmbedding() {
    try {
        console.log('Generating embedding...');
        const embedding = await generateEmbedding('Test sentence for dimension check.');
        console.log(`Embedding generated. Length: ${embedding.length}`);

        if (embedding.length === 1024) {
            console.log('SUCCESS: Embedding dimension is 1024.');
        } else {
            console.error(`FAILURE: Expected 1024, got ${embedding.length}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testEmbedding();
