const express = require('express');
const {
    startSchedulerController,
    stopSchedulerController,
    getSchedulerStatusController,
    manualPostController
} = require('../controllers/bluesky.scheduler');

const router = express.Router();

// GET /api/bluesky/scheduler/status?account=default
router.get('/scheduler/status', getSchedulerStatusController);

// POST /api/bluesky/scheduler/start?account=default
router.post('/scheduler/start', startSchedulerController);

// POST /api/bluesky/scheduler/stop?account=default
router.post('/scheduler/stop', stopSchedulerController);

// POST /api/bluesky/scheduler/manual-post?account=default
router.post('/scheduler/manual-post', manualPostController);

module.exports = router;
