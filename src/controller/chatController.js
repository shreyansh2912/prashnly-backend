const Document = require('../models/Document');
const Chat = require('../models/Chat');
const { generateEmbedding, generateChatResponse } = require('../utils/ai');
const vectorStore = require('../utils/vectorStore');

exports.chat = async (req, res) => {
    const { question, documentId, shareToken, chatId } = req.body;

    try {
        let document;
        let filter = {};
        let chatThread;

        if (chatId) {
            chatThread = await Chat.findById(chatId).populate('document');
            if (!chatThread) {
                return res.status(404).json({ message: 'Chat thread not found' });
            }
            document = chatThread.document;
            filter = { documentId: document._id.toString() };
        } else if (shareToken) {
            document = await Document.findOne({ shareToken });
            if (!document) {
                return res.status(404).json({ message: 'Invalid share link' });
            }
            filter = { documentId: document._id.toString() };
        } else if (documentId && req.user) {
            document = await Document.findOne({ _id: documentId, user: req.user.id });
            if (!document) {
                return res.status(404).json({ message: 'Document not found' });
            }
            filter = { documentId: document._id.toString() };
        } else {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const queryEmbedding = await generateEmbedding(question);

        const chunks = await vectorStore.query(queryEmbedding, filter, 5);

        const context = chunks.map((chunk) => chunk.content).join('\n\n');

        const history = chatThread ? chatThread.messages.slice(-10) : [];
        const answer = await generateChatResponse(question, context, history);

        if (!chatThread) {
            chatThread = new Chat({
                document: document._id,
                user: (req.user && req.user.id !== 'guest') ? req.user.id : undefined,
                messages: []
            });
        }

        chatThread.messages.push({ role: 'user', content: question });
        chatThread.messages.push({ role: 'assistant', content: answer });
        chatThread.updatedAt = Date.now();
        await chatThread.save();

        res.json({
            answer,
            sources: chunks.map(c => ({ id: c.id, similarity: c.similarity })),
            chatId: chatThread._id
        });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chatThread = await Chat.findById(chatId);

        if (!chatThread) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.json(chatThread.messages);
    } catch (error) {
        console.error('Get Chat History Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAllChats = async (req, res) => {
    try {
        const userDocuments = await Document.find({ user: req.user.id }).select('_id');
        const userDocumentIds = userDocuments.map(doc => doc._id);

        const chats = await Chat.find({
            $or: [
                { user: req.user.id },
                { document: { $in: userDocumentIds } }
            ]
        })
            .populate('document', 'title shareToken')
            .sort({ updatedAt: -1 });

        res.json(chats);
    } catch (error) {
        console.error('Get All Chats Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
