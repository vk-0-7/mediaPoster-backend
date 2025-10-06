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
// GET /api/twitter/fetch?username=elonmusk&count=100&account=maria
router.get('/fetch', fetchUserTweets);

// Analyze tweets with AI
// POST /api/twitter/analyze { apiKey: "...", account: "maria" }
router.post('/analyze', analyzeTweetsWithAI);

// Get all tweets with filters
// GET /api/twitter/tweets?posted=false&account=maria
router.get('/tweets', getTweets);

// Accept tweet (schedule for posting)
// POST /api/twitter/accept { tweetId: "...", postType: "feed", account: "maria" }
router.post('/accept', acceptTweet);

// Reject tweet (delete from database)
// POST /api/twitter/reject { tweetId: "...", account: "maria" }
router.post('/reject', rejectTweet);

// Deselect tweets
// POST /api/twitter/deselect { tweetIds: [...], account: "maria" }
router.post('/deselect', deselectTweets);

// Scheduler controls
// POST /api/twitter/scheduler/start?account=maria
router.post('/scheduler/start', startTwitterScheduler);
// POST /api/twitter/scheduler/stop?account=maria
router.post('/scheduler/stop', stopTwitterScheduler);
// GET /api/twitter/scheduler/status?account=maria
router.get('/scheduler/status', getTwitterSchedulerStatus);

// Manual post
// POST /api/twitter/post { tweetId: "...", account: "maria" }
router.post('/post', manualPostTweet);

module.exports = router;
