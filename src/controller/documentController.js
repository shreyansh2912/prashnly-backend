const Document = require('../models/Document');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const { generateEmbedding } = require('../utils/ai');
const { v4: uuidv4 } = require('uuid');
const vectorStore = require('../utils/vectorStore');
const fs = require('fs');
const path = require('path');

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const splitText = (text) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
    }
    return chunks;
};

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { originalname, mimetype, size, path: filePath } = req.file;
        const userId = req.user.id;

        // 2. Create MongoDB Document Entry
        const document = await Document.create({
            user: userId,
            title: originalname,
            originalName: originalname,
            mimeType: mimetype,
            size: size,
            storagePath: filePath, // Store local path
            status: 'processing',
        });
        console.log("before processDocument");

        // 3. Process File (Extract Text & Embed)
        // Read file from disk since we used diskStorage
        const fileBuffer = fs.readFileSync(filePath);
        processDocument(document, fileBuffer);

        console.log("after processDocument");


        res.status(201).json(document);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

const processDocument = async (document, buffer) => {
    try {
        let text = '';
        console.log("before pdf", document.mimeType, buffer);

        if (document.mimeType === 'application/pdf') {
            const data = await pdf(buffer);
            text = data.text;
        } else if (document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: buffer });
            text = result.value;
            if (result.messages.length > 0) {
                console.log("Mammoth messages:", result.messages);
            }
        } else {
            // Simple text fallback
            text = buffer.toString('utf-8');
        }

        const chunks = splitText(text);

        // Generate embeddings (Local model handles batching/looping)
        console.log(`[Process ${document._id}] Generating embeddings for ${chunks.length} chunks...`);
        const embeddings = await generateEmbedding(chunks);
        console.log(`[Process ${document._id}] Embeddings generated.`);

        const vectorItems = chunks.map((chunk, index) => ({
            id: `${document._id}_${index}`,
            text: chunk,
            embedding: embeddings[index],
            metadata: {
                documentId: document._id.toString(),
                userId: document.user.toString()
            }
        }));

        console.log(`[Process ${document._id}] Upserting ${vectorItems.length} vectors to Pinecone...`);
        await vectorStore.addDocuments(vectorItems);
        console.log(`[Process ${document._id}] Pinecone upsert complete.`);

        document.status = 'completed';
        document.vectorIds = vectorItems.map(v => v.id); // Store IDs if needed for reference
        document.shareToken = uuidv4(); // Generate share token on completion
        await document.save();

        console.log(`Document ${document._id} processed successfully.`);
    } catch (error) {
        console.error(`Error processing document ${document._id}:`, error);
        document.status = 'failed';
        await document.save();
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findOne({ _id: req.params.id, user: req.user.id });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Delete from Local Storage
        if (document.storagePath && fs.existsSync(document.storagePath)) {
            try {
                fs.unlinkSync(document.storagePath);
            } catch (err) {
                console.error('Error deleting local file:', err);
            }
        }

        // Delete Embeddings (Pinecone)
        await vectorStore.deleteDocuments({ documentId: document._id.toString() });

        await document.deleteOne();

        res.json({ message: 'Document removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
