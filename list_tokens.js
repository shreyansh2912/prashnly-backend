const mongoose = require('mongoose');
const Document = require('./src/models/Document');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prashnly');
        console.log('MongoDB Connected');

        await Document.find({});

        process.exit();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

connectDB();
