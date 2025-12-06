const mongoose = require('mongoose');
const Document = require('./src/models/Document');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prashnly');
        console.log('MongoDB Connected');

        const documents = await Document.find({});
        console.log('--- DOCUMENT LIST ---');
        if (documents.length === 0) {
            console.log('No documents found in database.');
        } else {
            documents.forEach(doc => {
                console.log(`Title: ${doc.title}`);
                console.log(`ShareToken: ${doc.shareToken}`);
                console.log('---');
            });
        }

        process.exit();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

connectDB();
