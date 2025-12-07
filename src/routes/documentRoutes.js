const express = require('express');
const router = express.Router();
const { uploadDocument, getDocuments, deleteDocument, toggleDocumentStatus, getPublicDocument, verifyDocumentPassword } = require('../controller/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.get('/public/:shareToken', getPublicDocument);
router.post('/public/:shareToken/verify', verifyDocumentPassword);
router.delete('/:id', protect, deleteDocument);
router.patch('/:id/status', protect, toggleDocumentStatus);

module.exports = router;
