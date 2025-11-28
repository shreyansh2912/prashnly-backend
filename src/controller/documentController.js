const Document = require('../models/Document');
const supabase = require('../config/supabase');
const pdf = require('pdf-parse');
const { generateEmbedding } = require('../utils/ai');
const { v4: uuidv4 } = require('uuid');

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

        const { originalname, mimetype, buffer, size } = req.file;
        const userId = req.user.id;
        const fileExt = originalname.split('.').pop();
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;

        // 1. Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('documents')
            .upload(fileName, buffer, {
                contentType: mimetype,
            });

        if (storageError) throw storageError;

        // 2. Create MongoDB Document Entry
        const document = await Document.create({
            user: userId,
            title: originalname,
            originalName: originalname,
            mimeType: mimetype,
            size: size,
            storagePath: fileName,
            status: 'processing',
        });

        // 3. Process File (Extract Text & Embed)
        // Note: In production, this should be a background job (Bull/Redis)
        processDocument(document, buffer);

        res.status(201).json(document);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

const processDocument = async (document, buffer) => {
    try {
        let text = '';

        if (document.mimeType === 'application/pdf') {
            const data = await pdf(buffer);
            text = data.text;
        } else {
            // Simple text fallback
            text = buffer.toString('utf-8');
        }

        const chunks = splitText(text);
        const vectorIds = [];

        for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk);

            // Insert into Supabase 'embeddings' table
            const { data, error } = await supabase
                .from('embeddings')
                .insert({
                    content: chunk,
                    metadata: { documentId: document._id.toString(), userId: document.user.toString() },
                    embedding: embedding,
                })
                .select('id');

            if (error) {
                console.error('Error inserting embedding:', error);
            } else {
                vectorIds.push(data[0].id);
            }
        }

        // Update Document Status
        document.status = 'completed';
        document.vectorIds = vectorIds;
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

        // Delete from Supabase Storage
        await supabase.storage.from('documents').remove([document.storagePath]);

        // Delete Embeddings (Optional: requires a delete query on Supabase)
        await supabase.from('embeddings').delete().eq('metadata->>documentId', document._id.toString());

        await document.deleteOne();

        res.json({ message: 'Document removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
