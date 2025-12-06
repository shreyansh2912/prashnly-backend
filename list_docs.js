const mongoose = require('mongoose');
const Document = require('./src/models/Document');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prashnly');
        console.log('MongoDB Connected');

        const documents = await Document.find({});
        console.log('Documents found:', documents.length);
        documents.forEach(doc => {
            console.log(`Title: ${doc.title}, ID: ${doc._id}, ShareToken: ${doc.shareToken}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
