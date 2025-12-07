const multer = require('multer');
const path = require('path');

const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = /pdf|txt|doc|docx/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

    const allowedMimeTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        console.log("File upload blocked:", file.mimetype, path.extname(file.originalname));
        cb(new Error('Error: File upload only supports PDF, TXT, DOC, and DOCX files.'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter,
});

module.exports = upload;
