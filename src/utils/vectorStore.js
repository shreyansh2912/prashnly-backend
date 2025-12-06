const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'prashnly';

class VectorStore {
    constructor() {
        if (!PINECONE_API_KEY) {
            console.warn('Pinecone API Key is missing!');
        }
        this.client = new Pinecone({
            apiKey: PINECONE_API_KEY,
        });
        this.index = this.client.index(PINECONE_INDEX_NAME);
    }

    /**
     * Add documents to Pinecone.
     * @param {Array<{id: string, text: string, embedding: number[], metadata: object}>} items 
     */
    async addDocuments(items) {
        if (!items.length) return;

        // Pinecone expects: { id, values, metadata }
        // We store the text content in metadata so we can retrieve it later
        const vectors = items.map(item => ({
            id: item.id,
            values: item.embedding,
            metadata: {
                ...item.metadata,
                text: item.text // Storing text in metadata for retrieval
            }
        }));

        // Upsert in batches of 100 to be safe
        const BATCH_SIZE = 100;
        for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
            const batch = vectors.slice(i, i + BATCH_SIZE);
            try {
                await this.index.upsert(batch);
            } catch (error) {
                console.error('Error upserting to Pinecone:', error);
                throw error;
            }
        }
    }

    /**
     * Query the vector store.
     * @param {number[]} queryEmbedding 
     * @param {object} filter - Metadata filter (e.g., { documentId: "..." })
     * @param {number} nResults 
     * @returns {Promise<Array<{id: string, content: string, metadata: object, similarity: number}>>}
     */
    async query(queryEmbedding, filter = {}, nResults = 5) {
        try {
            const queryResponse = await this.index.query({
                vector: queryEmbedding,
                topK: nResults,
                filter: filter, // Pinecone supports metadata filtering directly
                includeMetadata: true
            });

            return queryResponse.matches.map(match => ({
                id: match.id,
                content: match.metadata ? match.metadata.text : '', // Retrieve text from metadata
                metadata: match.metadata,
                similarity: match.score
            }));

        } catch (error) {
            console.error('Error querying Pinecone:', error);
            throw error;
        }
    }

    /**
     * Delete documents by filter.
     * Note: Pinecone delete by metadata is supported in starter/enterprise, but delete by ID is standard.
     * We will try deleteMany with filter if supported, or we might need to track IDs.
     * For now, we'll assume delete by metadata is available (Serverless indexes support it).
     * @param {object} filter 
     */
    async deleteDocuments(filter) {
        try {
            // Pinecone delete by metadata filter
            await this.index.deleteMany(filter);
        } catch (error) {
            console.error('Error deleting from Pinecone:', error);
            // Fallback or specific error handling if needed
            throw error;
        }
    }
}

// Export a singleton instance
module.exports = new VectorStore();
