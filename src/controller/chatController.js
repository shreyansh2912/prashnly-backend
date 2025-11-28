const Document = require('../models/Document');
const supabase = require('../config/supabase');
const { generateEmbedding, generateChatResponse } = require('../utils/ai');

exports.chat = async (req, res) => {
    const { question, documentId, shareToken } = req.body;

    try {
        let document;
        let filter = {};

        // 1. Resolve Document Context
        if (shareToken) {
            // Public Access
            document = await Document.findOne({ shareToken });
            if (!document) {
                return res.status(404).json({ message: 'Invalid share link' });
            }
            filter = { documentId: document._id.toString() };
        } else if (documentId && req.user) {
            // Authenticated Access
            document = await Document.findOne({ _id: documentId, user: req.user.id });
            if (!document) {
                return res.status(404).json({ message: 'Document not found' });
            }
            filter = { documentId: document._id.toString() };
        } else if (req.user) {
            // Chat with all user documents (optional feature)
            filter = { userId: req.user.id.toString() };
        } else {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // 2. Embed Question
        const queryEmbedding = await generateEmbedding(question);

        // 3. Search Vectors (Supabase RPC)
        const { data: chunks, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Adjust threshold as needed
            match_count: 5,
            filter: filter,
        });

        if (error) {
            console.error('Supabase Search Error:', error);
            return res.status(500).json({ message: 'Search failed' });
        }

        // 4. Construct Context
        const context = chunks.map((chunk) => chunk.content).join('\n\n');

        // 5. Generate Answer
        const answer = await generateChatResponse(question, context);

        res.json({
            answer,
            sources: chunks.map(c => ({ id: c.id, similarity: c.similarity })),
        });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
