const { generateEmbedding } = require('./ai');

async function testEmbedding() {
    try {
        const embedding = await generateEmbedding('Test sentence for dimension check.');

        if (embedding.length === 1024) {
        } else {
            console.error(`FAILURE: Expected 1024, got ${embedding.length}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testEmbedding();
