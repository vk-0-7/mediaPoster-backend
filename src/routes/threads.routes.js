const express = require('express');
const {
    startSchedulerController,
    stopSchedulerController,
    getSchedulerStatusController,
    manualPostController
} = require('../controllers/threads.scheduler');

const router = express.Router();

// GET /api/threads/scheduler/status?account=default
router.get('/scheduler/status', getSchedulerStatusController);

// POST /api/threads/scheduler/start?account=default
router.post('/scheduler/start', startSchedulerController);

// POST /api/threads/scheduler/stop?account=default
router.post('/scheduler/stop', stopSchedulerController);

// POST /api/threads/scheduler/manual-post?account=default
router.post('/scheduler/manual-post', manualPostController);

module.exports = router;
