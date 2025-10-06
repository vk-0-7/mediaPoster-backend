const express = require('express');
const {
    startSchedulerController,
    stopSchedulerController,
    getSchedulerStatusController,
    manualPostController
} = require('../controllers/instagram.scheduler');

const {
    uploadJSON,
    getPosts
} = require('../controllers/instagram.controllers');

const router = express.Router();

// Posts management
// GET /api/instagram/posts?account=dreamchasers
router.get('/posts', getPosts);

// POST /api/instagram/uploadJSON?account=dreamchasers
router.post('/uploadJSON', uploadJSON);

// Scheduler endpoints
// GET /api/instagram/scheduler/status?account=dreamchasers
router.get('/scheduler/status', getSchedulerStatusController);

// POST /api/instagram/scheduler/start?account=dreamchasers
router.post('/scheduler/start', startSchedulerController);

// POST /api/instagram/scheduler/stop?account=dreamchasers
router.post('/scheduler/stop', stopSchedulerController);

// POST /api/instagram/scheduler/manual-post?account=dreamchasers
router.post('/scheduler/manual-post', manualPostController);

module.exports = router;
