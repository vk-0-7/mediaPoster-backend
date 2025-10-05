const express = require('express');
const {
    startSchedulerController,
    stopSchedulerController,
    getSchedulerStatusController,
    manualPostController
} = require('../controllers/instascheduler.controllers');

const router = express.Router();

// GET /api/scheduler/status - Get scheduler status
router.get('/status', getSchedulerStatusController);

// POST /api/scheduler/start - Start the scheduler
router.post('/start', startSchedulerController);

// POST /api/scheduler/stop - Stop the scheduler
router.post('/stop', stopSchedulerController);

// POST /api/scheduler/manual-post - Trigger a manual post
router.post('/manual-post', manualPostController);




module.exports = router;
