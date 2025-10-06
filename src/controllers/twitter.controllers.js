const { TwitterApi } = require('twitter-api-v2');
const { getTwitterModelForAccount } = require('../models/twitter.models');
const { getTwitterConfig } = require('../utils/platformConfig');
const schedule = require('node-schedule');
const axios = require('axios');

// Store Twitter clients per account
const readClients = {};
const writeClients = {};

function initializeTwitterClient(account = 'maria') {
    try {
        const credentials = getTwitterConfig(account);

        // Read-only client (for fetching tweets)
        readClients[account] = new TwitterApi(credentials.BEARER_TOKEN);

        // Write client (for posting tweets)
        writeClients[account] = new TwitterApi({
            appKey: credentials.API_KEY,
            appSecret: credentials.API_SECRET,
            accessToken: credentials.ACCESS_TOKEN,
            accessSecret: credentials.ACCESS_SECRET,
        });

        console.log(`Twitter clients initialized for account: ${account}`);
    } catch (error) {
        console.error(`Error initializing Twitter client for ${account}:`, error.message);
    }
}

// Initialize both accounts on module load
initializeTwitterClient('maria');
initializeTwitterClient('divya');

// Fetch tweets from a specific user
const fetchUserTweets = async (req, res) => {
    try {
        const { username, count = 20, account = 'maria' } = req.query;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const readClient = readClients[account];
        if (!readClient) {
            return res.status(500).json({ error: `Twitter client not initialized for account: ${account}` });
        }

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

        // Get user by username
        const user = await readClient.v2.userByUsername(username);

        if (!user.data) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch user's tweets (excluding retweets and replies)
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
            account,
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
        const { apiKey, account = 'maria' } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'Claude API key is required in request body' });
        }

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

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
            account,
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
        const { analyzed, selected, posted, sortBy = '-aiAnalysis.score', account = 'maria' } = req.query;

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

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
            account,
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

// Smart scheduling algorithm based on time of day
// Calculates next schedule time from a given base time
function getSmartScheduleTimeFrom(baseTime) {
    const base = new Date(baseTime);

    // Get UTC hour and minutes
    const utcHour = base.getHours();
    const utcMinutes = base.getMinutes();

    // Convert to IST (UTC + 5.5 hours)
    const istHourDecimal = utcHour + utcMinutes/60 + 5.5;
    const istHour = Math.floor(istHourDecimal % 24);

    // Heavy posting period: 1pm (13:00) - 8pm (20:00) IST - Post every 2-3 hours
    // Light posting period: 8pm (20:00) - 1pm (13:00) IST - Post every 4-5 hours

    const isHeavyPeriod = istHour >= 13 && istHour < 20;

    let hours, minutes;

    if (isHeavyPeriod) {
        // Heavy posting: 2-3 hours interval with random minutes
        hours = Math.floor(Math.random() * 2) + 2; // 2-3 hours
        minutes = Math.floor(Math.random() * 60); // 0-59 minutes
    } else {
        // Light posting: 4-5 hours interval
        hours = Math.floor(Math.random() * 2) + 4; // 4-5 hours
        minutes = Math.floor(Math.random() * 60); // 0-59 minutes
    }

    // Calculate delay and scheduled time
    const delayMs = (hours * 60 + minutes) * 60 * 1000;
    const scheduledTime = new Date(base.getTime() + delayMs);

    // Debug logging
    console.log(`[SCHEDULER] Base: ${base.toLocaleString()}, UTC Hour: ${utcHour}, IST Hour: ${istHour}, Heavy: ${isHeavyPeriod}, Interval: ${hours}h ${minutes}m, Scheduled: ${scheduledTime.toLocaleString()}, Gap: ${(delayMs / (1000 * 60 * 60)).toFixed(2)}hrs`);

    return scheduledTime;
}

// Legacy function for backward compatibility
function getSmartScheduleTime() {
    const now = new Date();
    const utcHour = now.getHours();
    const utcMinutes = now.getMinutes();
    const istHourDecimal = utcHour + utcMinutes/60 + 5.5;
    const istHour = Math.floor(istHourDecimal % 24);

    console.log(`[SCHEDULER] Server UTC time: ${now.toLocaleString()}, UTC Hour: ${utcHour}, IST Hour: ${istHour}`);
    return getSmartScheduleTimeFrom(now);
}

// Accept a tweet (schedule it for posting)
const acceptTweet = async (req, res) => {
    try {
        const { tweetId, postType, account = 'maria' } = req.body;

        if (!tweetId) {
            return res.status(400).json({ error: 'tweetId is required' });
        }

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

        const tweet = await TwitterPost.findById(tweetId);

        if (!tweet) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        // Find the last tweet in queue (highest queue position)
        const lastTweetInQueue = await TwitterPost.findOne({
            isSelected: true,
            isPosted: false,
            queuePosition: { $ne: null }
        }).sort('-queuePosition');

        // Determine next queue position and scheduled time
        let queuePosition, scheduledTime;

        if (lastTweetInQueue) {
            // Queue exists, add to end
            queuePosition = lastTweetInQueue.queuePosition + 1;
            console.log(`[ACCEPT] Adding tweet to queue position ${queuePosition}, last tweet was at position ${lastTweetInQueue.queuePosition}`);
            // Calculate scheduled time from last tweet's scheduled time
            scheduledTime = getSmartScheduleTimeFrom(lastTweetInQueue.scheduledFor);
        } else {
            // First tweet in queue
            queuePosition = 1;
            console.log(`[ACCEPT] First tweet in queue, position ${queuePosition}`);
            // Calculate scheduled time from now
            scheduledTime = getSmartScheduleTime();
        }

        const now = new Date();
        const delayMs = scheduledTime.getTime() - now.getTime();
        const hours = Math.floor(delayMs / (1000 * 60 * 60));
        const minutes = Math.floor((delayMs % (1000 * 60 * 60)) / (1000 * 60));

        tweet.isSelected = true;
        tweet.queuePosition = queuePosition;
        tweet.scheduledFor = scheduledTime;
        tweet.postType = postType || 'feed';
        await tweet.save();

        res.status(200).json({
            message: 'Tweet accepted and scheduled successfully',
            account,
            tweet,
            queuePosition,
            scheduledIn: `${hours}h ${minutes}m`,
            scheduledFor: scheduledTime,
            postType: tweet.postType
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
        const { tweetId, account = 'maria' } = req.body;

        if (!tweetId) {
            return res.status(400).json({ error: 'tweetId is required' });
        }

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

        const result = await TwitterPost.findByIdAndDelete(tweetId);

        if (!result) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        res.status(200).json({
            message: 'Tweet rejected and deleted successfully',
            account,
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

// Deselect tweets (with queue rebalancing)
const deselectTweets = async (req, res) => {
    try {
        const { tweetIds, account = 'maria' } = req.body;

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

        // Find the tweets being canceled to get their queue positions
        const tweetsToCancel = await TwitterPost.find({
            _id: { $in: tweetIds }
        });

        // Get the minimum queue position being removed
        const minPosition = Math.min(...tweetsToCancel.map(t => t.queuePosition || Infinity));

        // Deselect the tweets
        await TwitterPost.updateMany(
            { _id: { $in: tweetIds } },
            { isSelected: false, scheduledFor: null, queuePosition: null }
        );

        // Rebalance queue: find all tweets with positions higher than the removed ones
        const tweetsToRebalance = await TwitterPost.find({
            isSelected: true,
            isPosted: false,
            queuePosition: { $gte: minPosition }
        }).sort('queuePosition');

        // Renumber and reschedule
        if (tweetsToRebalance.length > 0) {
            let currentPosition = minPosition;
            let previousScheduledTime = null;

            // Find the tweet before the rebalancing point to use as base time
            if (minPosition > 1) {
                const previousTweet = await TwitterPost.findOne({
                    isSelected: true,
                    isPosted: false,
                    queuePosition: minPosition - 1
                });
                if (previousTweet) {
                    previousScheduledTime = previousTweet.scheduledFor;
                }
            }

            // If no previous tweet, use current time
            const baseTime = previousScheduledTime || new Date();

            for (const tweet of tweetsToRebalance) {
                tweet.queuePosition = currentPosition;

                // Calculate new scheduled time
                if (currentPosition === 1 && !previousScheduledTime) {
                    // First in queue, schedule from now
                    tweet.scheduledFor = getSmartScheduleTime();
                    console.log(`[REBALANCE] Position ${currentPosition}: First tweet, scheduling from now`);
                } else {
                    // Schedule based on previous tweet's scheduled time
                    tweet.scheduledFor = getSmartScheduleTimeFrom(previousScheduledTime || baseTime);
                    console.log(`[REBALANCE] Position ${currentPosition}: Scheduling from position ${currentPosition - 1}`);
                }

                await tweet.save();

                // Update base time for next iteration
                previousScheduledTime = tweet.scheduledFor;
                currentPosition++;
            }
        }

        res.status(200).json({
            message: 'Tweets deselected and queue rebalanced successfully',
            account,
            count: tweetsToCancel.length,
            rebalanced: tweetsToRebalance.length
        });

    } catch (error) {
        console.error('Error deselecting tweets:', error);
        res.status(500).json({
            error: 'Failed to deselect tweets',
            details: error.message
        });
    }
};

// Community IDs mapping
const COMMUNITY_IDS = {
    softwareengineering: "1699807431709041070",
    buildinpublic: "1493446837214187523",
    webdevelopers: "1488952693443997701",
    startup: "1471580197908586507",
    memes: "1669501013441806336",
    techtwitter: "1472105760389668865",
};

// Post a tweet to Twitter (feed or community)
async function postTweetToTwitter(tweetText, postType = 'feed', account = 'maria') {
    try {
        const writeClient = writeClients[account];

        if (!writeClient) {
            console.error(`Twitter write client not initialized for account: ${account}`);
            return null;
        }

        let result;

        if (postType === 'feed') {
            // Regular tweet to feed
            result = await writeClient.v2.tweet(tweetText);
        } else {
            // Post to community
            const communityId = COMMUNITY_IDS[postType.toLowerCase()];

            if (!communityId) {
                console.error('Invalid community type:', postType);
                throw new Error(`Community type "${postType}" not found`);
            }

            // Post to community using community_id parameter
            result = await writeClient.v2.tweet({
                text: tweetText,
                community_id: communityId
            });
        }

        console.log(`Tweet posted for ${account}:`, result.data.id, 'to', postType);
        return result.data;

    } catch (error) {
        console.error('Error posting tweet:', error);
        throw error;
    }
}

// Scheduler state - per account
const schedulerRunning = {};
const schedulerJobs = {};

// Start the scheduler
const startTwitterScheduler = async (req, res) => {
    try {
        const { account = 'maria' } = req.query;

        if (schedulerRunning[account]) {
            return res.status(200).json({
                message: `Scheduler is already running for ${account}`,
                account,
                status: 'running'
            });
        }

        schedulerRunning[account] = true;

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

        // Check for scheduled tweets every minute
        schedulerJobs[account] = schedule.scheduleJob('*/1 * * * *', async () => {
            try {
                const now = new Date();

                // Find tweets that are scheduled and due to be posted
                // Sort by queuePosition to ensure exact order of selection
                const tweetsToPost = await TwitterPost.find({
                    isSelected: true,
                    isPosted: false,
                    scheduledFor: { $lte: now }
                }).sort('queuePosition').limit(1);

                if (tweetsToPost.length > 0) {
                    const tweet = tweetsToPost[0];

                    // Post to Twitter (feed or community)
                    const postedTweet = await postTweetToTwitter(tweet.text, tweet.postType || 'feed', account);

                    if (postedTweet) {
                        tweet.isPosted = true;
                        tweet.postedAt = new Date();
                        await tweet.save();

                        console.log(`Posted tweet for ${account} to ${tweet.postType || 'feed'}: ${tweet.text.substring(0, 50)}...`);
                    }
                }

            } catch (error) {
                console.error(`Error in scheduler for ${account}:`, error);
            }
        });

        res.status(200).json({
            message: `Twitter scheduler started successfully for ${account}`,
            account,
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
        const { account = 'maria' } = req.query;

        if (!schedulerRunning[account]) {
            return res.status(200).json({
                message: `Scheduler is not running for ${account}`,
                account,
                status: 'stopped'
            });
        }

        if (schedulerJobs[account]) {
            schedulerJobs[account].cancel();
            schedulerJobs[account] = null;
        }

        schedulerRunning[account] = false;

        res.status(200).json({
            message: `Twitter scheduler stopped successfully for ${account}`,
            account,
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
        const { account = 'maria' } = req.query;

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

        const upcomingTweets = await TwitterPost.find({
            isSelected: true,
            isPosted: false,
            scheduledFor: { $exists: true }
        }).sort('queuePosition').limit(5);

        res.status(200).json({
            account,
            status: schedulerRunning[account] ? 'running' : 'stopped',
            upcomingTweets: upcomingTweets.map(t => ({
                id: t._id,
                text: t.text.substring(0, 100),
                queuePosition: t.queuePosition,
                scheduledFor: t.scheduledFor,
                postType: t.postType
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
        const { tweetId, account = 'maria' } = req.body;

        // Get account-specific model
        const TwitterPost = getTwitterModelForAccount(account);

        const tweet = await TwitterPost.findById(tweetId);

        if (!tweet) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        // Post to Twitter with the specified postType (feed or community)
        const postedTweet = await postTweetToTwitter(tweet.text, tweet.postType || 'feed', account);

        if (postedTweet) {
            tweet.isPosted = true;
            tweet.postedAt = new Date();
            await tweet.save();
        }

        res.status(200).json({
            message: `Tweet posted successfully to ${tweet.postType || 'feed'}`,
            account,
            tweet,
            postedTo: tweet.postType || 'feed'
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
    acceptTweet,
    rejectTweet,
    deselectTweets,
    startTwitterScheduler,
    stopTwitterScheduler,
    getTwitterSchedulerStatus,
    manualPostTweet
};
