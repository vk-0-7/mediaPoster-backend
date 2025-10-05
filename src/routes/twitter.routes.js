const express = require('express');
const router = express.Router();
const {
    fetchUserTweets,
    analyzeTweetsWithAI,
    getTweets,
    selectTweetsForScheduling,
    deselectTweets,
    startTwitterScheduler,
    stopTwitterScheduler,
    getTwitterSchedulerStatus,
    manualPostTweet
} = require('../controllers/twitter.controllers');

// Fetch tweets from a user
router.get('/fetch', fetchUserTweets);

// Analyze tweets with AI
router.post('/analyze', analyzeTweetsWithAI);

// Get all tweets with filters
router.get('/tweets', getTweets);

// Select tweets for scheduling
router.post('/select', selectTweetsForScheduling);

// Deselect tweets
router.post('/deselect', deselectTweets);

// Scheduler controls
router.post('/scheduler/start', startTwitterScheduler);
router.post('/scheduler/stop', stopTwitterScheduler);
router.get('/scheduler/status', getTwitterSchedulerStatus);

// Manual post
router.post('/post', manualPostTweet);

module.exports = router;
