const express = require('express');
const {
    startSchedulerController,
    stopSchedulerController,
    getSchedulerStatusController,
    manualPostController
} = require('../controllers/instagram.scheduler');

const router = express.Router();

// GET /api/instagram/scheduler/status?account=dreamchasers
router.get('/scheduler/status', getSchedulerStatusController);

// POST /api/instagram/scheduler/start?account=dreamchasers
router.post('/scheduler/start', startSchedulerController);

// POST /api/instagram/scheduler/stop?account=dreamchasers
router.post('/scheduler/stop', stopSchedulerController);

// POST /api/instagram/scheduler/manual-post?account=dreamchasers
router.post('/scheduler/manual-post', manualPostController);

module.exports = router;
