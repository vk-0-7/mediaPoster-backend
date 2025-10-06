const express = require('express');
const router = express.Router();
const {
    fetchUserTweets,
    analyzeTweetsWithAI,
    getTweets,
    acceptTweet,
    rejectTweet,
    deselectTweets,
    startTwitterScheduler,
    stopTwitterScheduler,
    getTwitterSchedulerStatus,
    manualPostTweet
} = require('../controllers/twitter.controllers');

// Fetch tweets from a user
// GET /api/twitter/fetch?username=elonmusk&count=100
router.get('/fetch', fetchUserTweets);

// Analyze tweets with AI
router.post('/analyze', analyzeTweetsWithAI);

// Get all tweets with filters
// GET /api/twitter/tweets?posted=false
router.get('/tweets', getTweets);

// Accept tweet (schedule for posting)
// POST /api/twitter/accept { tweetId: "..." }
router.post('/accept', acceptTweet);

// Reject tweet (delete from database)
// POST /api/twitter/reject { tweetId: "..." }
router.post('/reject', rejectTweet);

// Deselect tweets
router.post('/deselect', deselectTweets);

// Scheduler controls
router.post('/scheduler/start', startTwitterScheduler);
router.post('/scheduler/stop', stopTwitterScheduler);
router.get('/scheduler/status', getTwitterSchedulerStatus);

// Manual post
router.post('/post', manualPostTweet);

module.exports = router;
