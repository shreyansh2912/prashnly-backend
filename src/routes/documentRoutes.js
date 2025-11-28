const express = require('express');
const router = express.Router();
const { uploadDocument, getDocuments, deleteDocument } = require('../controller/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.delete('/:id', protect, deleteDocument);

module.exports = router;
