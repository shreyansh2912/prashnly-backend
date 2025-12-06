const mongoose = require('mongoose');
const Document = require('./src/models/Document');
const Chat = require('./src/models/Chat');
const { chat, getChatHistory } = require('./src/controller/chatController');
const connectDB = require('./src/config/db');

// Mock Express Request/Response
const mockReq = (body = {}, params = {}, user = null) => ({
    body,
    params,
    user
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function testPersistence() {
    await connectDB();

    try {
        // 1. Get a document
        const doc = await Document.findOne();
        if (!doc) {
            console.error('No documents found. Please upload one first.');
            process.exit(1);
        }
        console.log(`Using document: ${doc.title} (${doc._id})`);

        // 2. Start new chat
        console.log('--- Test 1: Start New Chat ---');
        const req1 = mockReq({
            question: "What is this document about?",
            documentId: doc._id.toString()
        }, {}, { id: doc.user }); // Mock user
        const res1 = mockRes();

        await chat(req1, res1);

        if (res1.statusCode && res1.statusCode !== 200) {
            console.error('Chat failed:', res1.data);
            process.exit(1);
        }

        const chatId = res1.data.chatId;
        console.log('Chat started. Chat ID:', chatId);
        console.log('Answer:', res1.data.answer);

        if (!chatId) {
            console.error('FAILURE: No chatId returned.');
            process.exit(1);
        }

        // 3. Continue chat
        console.log('\n--- Test 2: Continue Chat ---');
        const req2 = mockReq({
            question: "Tell me more.",
            chatId: chatId
        });
        const res2 = mockRes();

        await chat(req2, res2);
        console.log('Follow-up answer:', res2.data.answer);

        // 4. Fetch History
        console.log('\n--- Test 3: Fetch History ---');
        const req3 = mockReq({}, { chatId });
        const res3 = mockRes();

        await getChatHistory(req3, res3);
        const history = res3.data;

        console.log(`History length: ${history.length}`);
        if (history.length === 4) { // 2 user + 2 assistant
            console.log('SUCCESS: History retrieved correctly.');
        } else {
            console.error(`FAILURE: Expected 4 messages, got ${history.length}`);
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testPersistence();
