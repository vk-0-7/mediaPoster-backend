const { TwitterApi } = require('twitter-api-v2');
const TwitterPost = require('../models/twitter.models');
const schedule = require('node-schedule');
const axios = require('axios');

// Initialize Twitter clients
let readClient = null;
let writeClient = null;

function initializeTwitterClient() {
    try {
        // Read-only client (for fetching tweets)
        readClient = new TwitterApi(process.env.X_BEARER_TOKEN_FOR_MARIA);

        // Write client (for posting tweets)
        writeClient = new TwitterApi({
            appKey: process.env.X_API_KEY_FOR_MARIA,
            appSecret: process.env.X_API_KEY_SECRET_FOR_MARIA,
            accessToken: process.env.X_ACCESS_TOKEN_FOR_MARIA,
            accessSecret: process.env.X_ACCESS_SECRET_FOR_MARIA,
        });

        console.log('Twitter clients initialized');
    } catch (error) {
        console.error('Error initializing Twitter client:', error.message);
    }
}

// Initialize on module load
initializeTwitterClient();

// Fetch tweets from a specific user
const fetchUserTweets = async (req, res) => {
    try {
        const { username, count = 20 } = req.query;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        if (!readClient) {
            return res.status(500).json({ error: 'Twitter client not initialized' });
        }

        // Get user by username
        const user = await readClient.v2.userByUsername(username);

        if (!user.data) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch user's tweets
        const tweets = await readClient.v2.userTimeline(user.data.id, {
            max_results: Math.min(parseInt(count), 100),
            'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
            exclude: ['retweets', 'replies']
        });

        const tweetData = [];
        for await (const tweet of tweets) {
            // Save to database
            const tweetDoc = await TwitterPost.findOneAndUpdate(
                { tweetId: tweet.id },
                {
                    tweetId: tweet.id,
                    text: tweet.text,
                    author: {
                        id: user.data.id,
                        username: user.data.username,
                        name: user.data.name
                    },
                    createdAt: tweet.created_at,
                    metrics: {
                        likes: tweet.public_metrics?.like_count || 0,
                        retweets: tweet.public_metrics?.retweet_count || 0,
                        replies: tweet.public_metrics?.reply_count || 0,
                        views: tweet.public_metrics?.impression_count || 0
                    }
                },
                { upsert: true, new: true }
            );

            tweetData.push(tweetDoc);
        }

        res.status(200).json({
            message: 'Tweets fetched successfully',
            count: tweetData.length,
            tweets: tweetData
        });

    } catch (error) {
        console.error('Error fetching tweets:', error);
        res.status(500).json({
            error: 'Failed to fetch tweets',
            details: error.message
        });
    }
};

// Analyze tweets with AI (using Anthropic Claude API)
const analyzeTweetsWithAI = async (req, res) => {
    try {
        const { apiKey } = req.body; // User provides their Claude API key

        if (!apiKey) {
            return res.status(400).json({ error: 'Claude API key is required in request body' });
        }

        // Get all unanalyzed tweets
        const tweets = await TwitterPost.find({
            'aiAnalysis.score': { $exists: false }
        }).limit(50);

        if (tweets.length === 0) {
            return res.status(200).json({
                message: 'No tweets to analyze',
                analyzed: 0
            });
        }

        const analyzedTweets = [];

        for (const tweet of tweets) {
            try {
                // Call Claude API for analysis
                const response = await axios.post(
                    'https://api.anthropic.com/v1/messages',
                    {
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 500,
                        messages: [{
                            role: 'user',
                            content: `Analyze this tweet and provide a JSON response with the following structure:
{
  "score": <number 1-10>,
  "category": "<motivational|technical|humorous|informational|other>",
  "summary": "<brief summary>",
  "reasoning": "<why this tweet is good/bad>"
}

Tweet: "${tweet.text}"

Metrics: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets

Rate the tweet's quality for reposting based on engagement potential, relevance, and content quality.`
                        }]
                    },
                    {
                        headers: {
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01',
                            'content-type': 'application/json'
                        }
                    }
                );

                // Parse AI response
                const aiContent = response.data.content[0].text;
                const jsonMatch = aiContent.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const analysis = JSON.parse(jsonMatch[0]);

                    // Update tweet with AI analysis
                    tweet.aiAnalysis = {
                        score: analysis.score,
                        category: analysis.category,
                        summary: analysis.summary,
                        reasoning: analysis.reasoning
                    };

                    await tweet.save();
                    analyzedTweets.push(tweet);
                }

                // Rate limiting - wait 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`Error analyzing tweet ${tweet.tweetId}:`, error.message);
            }
        }

        res.status(200).json({
            message: 'Tweets analyzed successfully',
            analyzed: analyzedTweets.length,
            tweets: analyzedTweets
        });

    } catch (error) {
        console.error('Error in AI analysis:', error);
        res.status(500).json({
            error: 'Failed to analyze tweets',
            details: error.message
        });
    }
};

// Get all tweets with optional filters
const getTweets = async (req, res) => {
    try {
        const { analyzed, selected, posted, sortBy = '-aiAnalysis.score' } = req.query;

        const filter = {};

        if (analyzed === 'true') {
            filter['aiAnalysis.score'] = { $exists: true };
        } else if (analyzed === 'false') {
            filter['aiAnalysis.score'] = { $exists: false };
        }

        if (selected !== undefined) {
            filter.isSelected = selected === 'true';
        }

        if (posted !== undefined) {
            filter.isPosted = posted === 'true';
        }

        const tweets = await TwitterPost.find(filter).sort(sortBy);

        res.status(200).json({
            count: tweets.length,
            tweets
        });

    } catch (error) {
        console.error('Error fetching tweets:', error);
        res.status(500).json({
            error: 'Failed to fetch tweets',
            details: error.message
        });
    }
};

// Accept a tweet (schedule it for posting)
const acceptTweet = async (req, res) => {
    try {
        const { tweetId } = req.body;

        if (!tweetId) {
            return res.status(400).json({ error: 'tweetId is required' });
        }

        const tweet = await TwitterPost.findById(tweetId);

        if (!tweet) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        // Generate random delay between 2-4 hours and 0-60 minutes
        const hours = Math.floor(Math.random() * 3) + 2; // 2-4 hours
        const minutes = Math.floor(Math.random() * 61); // 0-60 minutes
        const delayMs = (hours * 60 + minutes) * 60 * 1000;

        const scheduledTime = new Date(Date.now() + delayMs);

        tweet.isSelected = true;
        tweet.scheduledFor = scheduledTime;
        await tweet.save();

        res.status(200).json({
            message: 'Tweet accepted and scheduled successfully',
            tweet,
            scheduledIn: `${hours}h ${minutes}m`
        });

    } catch (error) {
        console.error('Error accepting tweet:', error);
        res.status(500).json({
            error: 'Failed to accept tweet',
            details: error.message
        });
    }
};

// Reject a tweet (delete it from database)
const rejectTweet = async (req, res) => {
    try {
        const { tweetId } = req.body;

        if (!tweetId) {
            return res.status(400).json({ error: 'tweetId is required' });
        }

        const result = await TwitterPost.findByIdAndDelete(tweetId);

        if (!result) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        res.status(200).json({
            message: 'Tweet rejected and deleted successfully',
            deletedTweet: result
        });

    } catch (error) {
        console.error('Error rejecting tweet:', error);
        res.status(500).json({
            error: 'Failed to reject tweet',
            details: error.message
        });
    }
};

// Deselect tweets
const deselectTweets = async (req, res) => {
    try {
        const { tweetIds } = req.body;

        const result = await TwitterPost.updateMany(
            { _id: { $in: tweetIds } },
            { isSelected: false, scheduledFor: null }
        );

        res.status(200).json({
            message: 'Tweets deselected successfully',
            count: result.modifiedCount
        });

    } catch (error) {
        console.error('Error deselecting tweets:', error);
        res.status(500).json({
            error: 'Failed to deselect tweets',
            details: error.message
        });
    }
};

// Post a tweet to Twitter
async function postTweetToTwitter(tweetText) {
    try {
        if (!writeClient) {
            console.error('Twitter write client not initialized');
            return null;
        }

        const result = await writeClient.v2.tweet(tweetText);
        console.log('Tweet posted:', result.data.id);
        return result.data;

    } catch (error) {
        console.error('Error posting tweet:', error);
        throw error;
    }
}

// Scheduler state
let schedulerRunning = false;
let schedulerJob = null;

// Start the scheduler
const startTwitterScheduler = async (req, res) => {
    try {
        if (schedulerRunning) {
            return res.status(200).json({
                message: 'Scheduler is already running',
                status: 'running'
            });
        }

        schedulerRunning = true;

        // Check for scheduled tweets every minute
        schedulerJob = schedule.scheduleJob('*/1 * * * *', async () => {
            try {
                const now = new Date();

                // Find tweets that are scheduled and due to be posted
                const tweetsToPost = await TwitterPost.find({
                    isSelected: true,
                    isPosted: false,
                    scheduledFor: { $lte: now }
                }).sort('scheduledFor').limit(1);

                if (tweetsToPost.length > 0) {
                    const tweet = tweetsToPost[0];

                    // Post to Twitter
                    const postedTweet = await postTweetToTwitter(tweet.text);

                    if (postedTweet) {
                        tweet.isPosted = true;
                        tweet.postedAt = new Date();
                        await tweet.save();

                        console.log(`Posted tweet: ${tweet.text.substring(0, 50)}...`);
                    }
                }

            } catch (error) {
                console.error('Error in scheduler:', error);
            }
        });

        res.status(200).json({
            message: 'Twitter scheduler started successfully',
            status: 'running'
        });

    } catch (error) {
        console.error('Error starting scheduler:', error);
        res.status(500).json({
            error: 'Failed to start scheduler',
            details: error.message
        });
    }
};

// Stop the scheduler
const stopTwitterScheduler = async (req, res) => {
    try {
        if (!schedulerRunning) {
            return res.status(200).json({
                message: 'Scheduler is not running',
                status: 'stopped'
            });
        }

        if (schedulerJob) {
            schedulerJob.cancel();
            schedulerJob = null;
        }

        schedulerRunning = false;

        res.status(200).json({
            message: 'Twitter scheduler stopped successfully',
            status: 'stopped'
        });

    } catch (error) {
        console.error('Error stopping scheduler:', error);
        res.status(500).json({
            error: 'Failed to stop scheduler',
            details: error.message
        });
    }
};

// Get scheduler status
const getTwitterSchedulerStatus = async (req, res) => {
    try {
        const upcomingTweets = await TwitterPost.find({
            isSelected: true,
            isPosted: false,
            scheduledFor: { $exists: true }
        }).sort('scheduledFor').limit(5);

        res.status(200).json({
            status: schedulerRunning ? 'running' : 'stopped',
            upcomingTweets: upcomingTweets.map(t => ({
                id: t._id,
                text: t.text.substring(0, 100),
                scheduledFor: t.scheduledFor
            }))
        });

    } catch (error) {
        console.error('Error getting scheduler status:', error);
        res.status(500).json({
            error: 'Failed to get scheduler status',
            details: error.message
        });
    }
};

// Manual post (for testing)
const manualPostTweet = async (req, res) => {
    try {
        const { tweetId } = req.body;

        const tweet = await TwitterPost.findById(tweetId);

        if (!tweet) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        const postedTweet = await postTweetToTwitter(tweet.text);

        if (postedTweet) {
            tweet.isPosted = true;
            tweet.postedAt = new Date();
            await tweet.save();
        }

        res.status(200).json({
            message: 'Tweet posted successfully',
            tweet
        });

    } catch (error) {
        console.error('Error posting tweet:', error);
        res.status(500).json({
            error: 'Failed to post tweet',
            details: error.message
        });
    }
};

module.exports = {
    fetchUserTweets,
    analyzeTweetsWithAI,
    getTweets,
    selectTweetsForScheduling,
    deselectTweets,
    startTwitterScheduler,
    stopTwitterScheduler,
    getTwitterSchedulerStatus,
    manualPostTweet
};
