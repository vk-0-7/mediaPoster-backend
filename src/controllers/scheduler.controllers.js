const schedule = require("node-schedule");
const axios = require("axios");
const dotenv = require("dotenv");
const InstagramPost = require('../models/posts.models');

const START_HOUR = 8 - 5;
const END_HOUR = 23 - 5;    

let isSchedulerRunning = false;
let currentJob = null;


dotenv.config();

const PAGE_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;        // Instagram Business/Creator account ID
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

console.log("PAGE_ID", PAGE_ID);
console.log("ACCESS_TOKEN", ACCESS_TOKEN);

async function postReel() {
    try {
        console.log("Posting Reel at", new Date().toLocaleString());

        // 1. Get unposted content from DB
        const unpostedPost = await InstagramPost.findOne({ isPosted: false });
        if (!unpostedPost) {
            console.log("No unposted content available");
            return;
        }

        const { videoUrl, caption, hashtags } = unpostedPost;
        const hashtagsString = hashtags && hashtags.length > 0 ? " " + hashtags.join(" ") : "";

        let containerId = null;

        try {
            const createRes = await axios.post(
                `https://graph.facebook.com/v23.0/${PAGE_ID}/media`,
                null,
                {
                    params: {
                        media_type: "REELS",
                        video_url: videoUrl,
                        caption: caption || "" + hashtagsString,
                        share_to_feed: true,
                        access_token: ACCESS_TOKEN,
                    }
                },
            );

            containerId = createRes.data.id;
            console.log("Created video container:", containerId);
        } catch (error) {
            console.error("Error creating video container:", error);
            return;
        }


        // 3. Wait and check status
        let status = "IN_PROGRESS";
        while (status === "IN_PROGRESS") {
            await new Promise((resolve) => setTimeout(resolve, 60000)); // wait 1 min

            const statusRes = await axios.get(
                `https://graph.facebook.com/v23.0/${containerId}?fields=status_code&access_token=${ACCESS_TOKEN}`
            );

            status = statusRes.data.status_code;
            console.log("Upload status:", status);
        }

        if (status !== "FINISHED") {
            console.error("Upload failed with status:", status);
            return;
        }

        // 4. Publish video
        const publishRes = await axios.post(
            `https://graph.facebook.com/v23.0/${PAGE_ID}/media_publish`,
            {
                creation_id: containerId,
                access_token: ACCESS_TOKEN,
            }
        );

        console.log("Published reel:", publishRes.data);

        // 5. Update DB
        await InstagramPost.findByIdAndUpdate(unpostedPost._id, { isPosted: true });
        console.log(`Marked post ${unpostedPost._id} as posted.`);

    } catch (error) {
        console.error("Error posting reel:", error.response?.data || error.message);
    }
}


// Generate random delay (in ms) between 1–4 hours
function getRandomDelay() {
    const hours = Math.floor(Math.random() * 4) + 1; // 1–4 hrs
    const minutes = Math.floor(Math.random() * 60);
    return (hours * 60 + minutes) * 60 * 1000; // ms
}

// Ensure time is inside allowed daytime window
function adjustToDaytime(nextTime) {
    const hour = nextTime.getHours();

    if (hour < START_HOUR) {
        // Too early → shift to today 9AM
        nextTime.setHours(START_HOUR, 0, 0, 0);
    } else if (hour >= END_HOUR) {
        // Too late → shift to tomorrow 9AM
        nextTime.setDate(nextTime.getDate() + 1);
        nextTime.setHours(START_HOUR, 0, 0, 0);
    }
    return nextTime;
}

// Recursive scheduler
function scheduleNextPost() {
    const delay = getRandomDelay();
    // const delay = 1 * 60 * 1000; 
    let nextTime = new Date(Date.now() + delay);
    nextTime = adjustToDaytime(nextTime);

    console.log("Next post scheduled at", nextTime.toLocaleString());

    currentJob = schedule.scheduleJob(nextTime, async () => {
        await postReel();
        if (isSchedulerRunning) {
            scheduleNextPost(); // chain the next one
        }
    });
}


function startScheduler() {
    if (isSchedulerRunning) {
        return { message: "Scheduler is already running" };
    }

    isSchedulerRunning = true;

    // Start cycle at 12PM daily
    schedule.scheduleJob("0 12 * * *", () => {
        console.log("Starting daily posting cycle...");
        if (isSchedulerRunning) {
            scheduleNextPost();
        }
    });

    // Also start immediately for testing
    scheduleNextPost();

    console.log("Scheduler started successfully");
    return { message: "Scheduler started successfully" };
}

// Stop the scheduler
function stopScheduler() {
    isSchedulerRunning = false;

    // Cancel current job
    if (currentJob) {
        currentJob.cancel();
        currentJob = null;
    }

    // Cancel all scheduled jobs
    schedule.gracefulShutdown();

    console.log("Scheduler stopped");
    return { message: "Scheduler stopped successfully" };
}

// Get scheduler status
function getSchedulerStatus() {
    return {
        isRunning: isSchedulerRunning,
        nextScheduledTime: currentJob ? currentJob.nextInvocation() : null,
        totalScheduledJobs: Object.keys(schedule.scheduledJobs).length
    };
}

// Controller functions for API endpoints
const startSchedulerController = async (req, res) => {
    try {
        const result = startScheduler();
        res.status(200).json(result);
    } catch (error) {
        console.error("Error starting scheduler:", error);
        res.status(500).json({ error: "Failed to start scheduler", details: error.message });
    }
};

const stopSchedulerController = async (req, res) => {
    try {
        const result = stopScheduler();
        res.status(200).json(result);
    } catch (error) {
        console.error("Error stopping scheduler:", error);
        res.status(500).json({ error: "Failed to stop scheduler", details: error.message });
    }
};

const getSchedulerStatusController = async (req, res) => {
    try {
        const status = getSchedulerStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error("Error getting scheduler status:", error);
        res.status(500).json({ error: "Failed to get scheduler status", details: error.message });
    }
};

// Manual post trigger (for testing)
const manualPostController = async (req, res) => {
    try {
        await postReel();
        res.status(200).json({ message: "Post triggered manually" });
    } catch (error) {
        console.error("Error in manual post:", error);
        res.status(500).json({ error: "Failed to post manually", details: error.message });
    }
};

module.exports = {
    startSchedulerController,
    stopSchedulerController,
    getSchedulerStatusController,
    manualPostController
};
