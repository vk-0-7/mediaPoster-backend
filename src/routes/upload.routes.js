const express = require('express');
const router = express.Router();

// POST /api/upload - Handle file uploads
router.post('/', (req, res) => {
    res.json({ message: 'Upload endpoint working', data: req.body });
});

// GET /api/upload - Get upload history
router.get('/', (req, res) => {
    res.json({ message: 'Upload history endpoint working', uploads: [] });
});

module.exports = router;
