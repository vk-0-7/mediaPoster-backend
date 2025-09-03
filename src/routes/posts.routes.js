const express = require('express');
const { uploadJSON, getPosts } = require('../controllers/posts.controllers');
const InstagramPost = require('../models/posts.models');
const router = express.Router();

// GET /api/posts - Get all posts
router.get('/', getPosts);

router.post('/uploadJSON', uploadJSON);


module.exports = router;
