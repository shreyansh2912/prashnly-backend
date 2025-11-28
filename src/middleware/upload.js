const multer = require('multer');
const path = require('path');

// Use memory storage so we can upload directly to Supabase without saving to disk first
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const filetypes = /pdf|txt|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: File upload only supports the following filetypes - ' + filetypes));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter,
});

module.exports = upload;
