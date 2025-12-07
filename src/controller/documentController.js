const Document = require('../models/Document');
const mammoth = require('mammoth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
        const { title, visibility, protectionType, password } = req.body;
        const userId = req.user.id;

        // Check Plan Limits
        if (req.user.plan === 'basic') {
            const docCount = await Document.countDocuments({ user: userId });
            if (docCount >= 10) {
                // Delete the uploaded file since we are rejecting the request
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(403).json({
                    message: 'Plan limit reached. Basic plan allows only 10 documents. Please upgrade.'
                });
            }
        }

        let passwordHash = undefined;
        if (visibility === 'protected' && protectionType === 'password' && password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        // 2. Create MongoDB Document Entry
        const document = await Document.create({
            user: userId,
            title: title || originalname,
            originalName: originalname,
            mimeType: mimetype,
            size: size,
            storagePath: filePath, // Store local path
            status: 'processing',
            visibility: visibility || 'private',
            protectionType: protectionType || 'none',
            passwordHash: passwordHash,
            isActive: true
        });

        // 3. Process File (Extract Text & Embed)
        // Read file from disk since we used diskStorage
        const fileBuffer = fs.readFileSync(filePath);
        const io = req.app.get('io');
        processDocument(document, fileBuffer, io);

        res.status(201).json(document);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

const processDocument = async (document, buffer, io) => {
    try {
        const emitProgress = (progress, message) => {
            if (io) {
                io.emit(`uploadProgress:${document._id}`, { progress, message });
            }
        };

        emitProgress(10, 'Parsing document...');
        let text = '';
        console.log("before pdf", document.mimeType, buffer);

        if (document.mimeType === 'application/pdf') {
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
            const data = new Uint8Array(buffer);
            const loadingTask = pdfjsLib.getDocument(data);
            const pdfDocument = await loadingTask.promise;
            let fullText = '';

            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            text = fullText;
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

        emitProgress(30, 'Text extracted. Generating embeddings...');

        const chunks = splitText(text);

        // Generate embeddings (Local model handles batching/looping)
        const embeddings = await generateEmbedding(chunks);

        emitProgress(70, 'Embeddings generated. Indexing...');

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

        emitProgress(100, 'Document processed successfully.');
        console.log(`Document ${document._id} processed successfully.`);
    } catch (error) {
        console.error(`Error processing document ${document._id}:`, error);
        document.status = 'failed';
        await document.save();
        if (io) {
            io.emit(`uploadProgress:${document._id}`, { progress: 0, message: 'Processing failed.' });
        }
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

exports.toggleDocumentStatus = async (req, res) => {
    try {
        const document = await Document.findOne({ _id: req.params.id, user: req.user.id });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        document.isActive = !document.isActive;
        await document.save();

        res.json({ message: 'Document status updated', isActive: document.isActive });
    } catch (error) {
        console.error('Toggle Status Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.verifyDocumentPassword = async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { password } = req.body;

        const document = await Document.findOne({ shareToken }).select('+passwordHash');

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (document.protectionType !== 'password') {
            return res.status(400).json({ message: 'Document is not password protected' });
        }

        if (!document.passwordHash) {
            return res.status(500).json({ message: 'Server Error: Password hash missing for protected document' });
        }

        const isMatch = await bcrypt.compare(password, document.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Generate temporary guest token
        const token = jwt.sign(
            { id: 'guest', role: 'guest', documentId: document._id },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '2h' } // Token valid for 2 hours
        );

        res.json({ token });
    } catch (error) {
        console.error('Verify Password Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getPublicDocument = async (req, res) => {
    try {
        const { shareToken } = req.params;
        const document = await Document.findOne({ shareToken }).select('title isActive visibility protectionType');

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.json(document);
    } catch (error) {
        console.error('Get Public Document Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
