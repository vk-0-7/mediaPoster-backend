const schedule = require("node-schedule");
const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require('mongoose');
const InstagramPost = require('../models/posts.models');
const { sendEmail } = require("../utils/email");

const START_HOUR = 8 - 5.5;
const END_HOUR = 23 - 5.5;    

let isSchedulerRunning = {};
let currentJob = {};
let startedAt = {};


dotenv.config();

function getAccountConfig(account) {
    const normalized = (account || '').toLowerCase();
    if (normalized === 'codingwithbugs') {
        return {
            PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_CODINGWITHBUGS,
            ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_CODINGWITHBUGS,
        };
    }
    if (normalized === 'vallendros') {
        return {
            PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_VELLANDROS,
            ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_VELLANDROS,
        };
    }
    if (normalized === 'dailyaiinsights') {
        return {
            PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_DAILY_AI_INSIGHTS,
            ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_DAILY_AI_INSIGHTS,
        };
    }
    // default to dreamchasers
    return {
        PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_DREAMCHASERS,
        ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_DREAMCAHSERS
    };
}


const getCaptions = (caption, account) => {
    const normalize = (account || '').toLowerCase();
    if (normalize === 'codingwithbugs') {
        return caption + " #codingwithbugs";
    }
    else if (normalize === 'vallendros') {
        let cap = `2025 will be our year ❤️🔥💸
       Follow and manifest now !!
       -
       -
       -
       DM for credits or removal 🤝
       -
       -
       -
       #motivation #inspiration #success #wealth #money #blessed #adrenaline #goal #achievement #vision #dream #
       `
        return cap;
    }
    else if (normalize === 'dailyaiinsights') {
        return caption + " #dailyaiinsights #ai #artificialintelligence #tech #innovation";
    }
    else if (normalize === 'dreamchasers') {
        return caption + " #dreamchasers";
    }
    else {
        return caption;
    }
}

function getPostModelForAccount(account) {
    const normalized = (account || 'dreamchasers').toLowerCase();
    const collectionName = normalized !== "codingwithbugs" ? `InstagramPost_${normalized}` : `InstagramPost`;
    const modelName = normalized !== "codingwithbugs" ? `InstagramPostModel_${normalized}` : `InstagramPostModel`;
    return mongoose.models[modelName] || mongoose.model(modelName, InstagramPost.schema, collectionName);
}

async function postReel(account) {
    try {
        // console.log("Posting Reel at", new Date().toLocaleString());
        const { PAGE_ID, ACCESS_TOKEN } = getAccountConfig(account);
        const PostModel = getPostModelForAccount(account);

        // 1. Get unposted content from DB
        const unpostedPost = await PostModel.findOne({ isPosted: false });
        if (!unpostedPost) {
            console.log("No unposted content available");
            return;
        }

        const { videoUrl, caption, hashtags } = unpostedPost;
        const hashtagsString = hashtags && hashtags.length > 0 ? " " + hashtags.join(" ") : "";

        let containerId = null;
        // console.log("PAGE_ID:", PAGE_ID);
        // console.log("ACCESS_TOKEN:", ACCESS_TOKEN);
        // console.log("videoUrl:", videoUrl);
        // console.log("caption:", caption);
        // console.log("hashtags:", hashtags);
        // console.log("hashtagsString:", hashtagsString);


        try {
            const createRes = await axios.post(
                `https://graph.facebook.com/v23.0/${PAGE_ID}/media`,
                null,
                {
                    params: {
                        media_type: "REELS",
                        video_url: videoUrl,
                        caption: getCaptions(caption),
                        share_to_feed: true,
                        access_token: ACCESS_TOKEN,
                    }
                },
            );

            containerId = createRes.data.id;
            // console.log("Created video container:", containerId);
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
        await PostModel.findByIdAndUpdate(unpostedPost._id, { isPosted: true });
        console.log(`Marked post ${unpostedPost._id} as posted.`);

    } catch (error) {
        console.error("Error posting reel:", error.response?.data || error.message);
        sendEmail('something went Wrong', `There is an error while posting from  account ${account}`)
    }
}


// Generate random delay (in ms) between 1–4 hours
function getRandomDelay() {
    const hours = Math.floor(Math.random() * 4) + 3; // 3–6 hrs
    const minutes = Math.floor(Math.random() * 60);
    return (hours * 60 + minutes) * 60 * 1000; // ms
}

// Ensure time is inside allowed daytime window
function adjustToDaytime(nextTime) {
    const hour = nextTime.getHours();

    if (hour < START_HOUR) {
        // Too early → shift to today random time between 9AM-12PM
        const randomHour = Math.floor(Math.random() * 4) + START_HOUR; // 9-12
        const randomMinute = Math.floor(Math.random() * 60);
        nextTime.setHours(randomHour, randomMinute, 0, 0);
    } else if (hour >= END_HOUR) {
        // Too late → shift to tomorrow random time between 9AM-12PM
        nextTime.setDate(nextTime.getDate() + 1);
        const randomHour = Math.floor(Math.random() * 4) + START_HOUR; // 9-12
        const randomMinute = Math.floor(Math.random() * 60);
        nextTime.setHours(randomHour, randomMinute, 0, 0);
    }
    return nextTime;
}

// Recursive scheduler
function scheduleNextPost(account) {
    // Cancel existing job if any to prevent duplicates
    if (currentJob[account]) {
        currentJob[account].cancel();
        currentJob[account] = null;
    }

    const delay = getRandomDelay();
    const delayHours = Math.floor(delay / (1000 * 60 * 60));
    const delayMinutes = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));
    console.log(`[${account}] Delay: ${delayHours}h ${delayMinutes}m`);

    let nextTime = new Date(Date.now() + delay);
    nextTime = adjustToDaytime(nextTime);

    console.log(`[${account}] Next post scheduled at`, nextTime.toLocaleString());

    currentJob[account] = schedule.scheduleJob(nextTime, async () => {
        await postReel(account);
        if (isSchedulerRunning[account]) {
            scheduleNextPost(account); // chain the next one
        }
    });
}


function startScheduler(account) {
    if (isSchedulerRunning[account]) {
        return { message: "Scheduler is already running", status: 'running' };
    }

    // Clean up any existing jobs before starting
    if (currentJob[account]) {
        currentJob[account].cancel();
        currentJob[account] = null;
    }

    isSchedulerRunning[account] = true;
    startedAt[account] = new Date();

    // Start immediately with proper scheduling chain
    scheduleNextPost(account);

    console.log(`[${account}] Scheduler started successfully`);
    return { message: "Scheduler started successfully", status: 'running' };
}

// Stop the scheduler
function stopScheduler(account) {
    isSchedulerRunning[account] = false;

    // Cancel current job
    if (currentJob[account]) {
        currentJob[account].cancel();
        currentJob[account] = null;
    }

    // Clear started time
    delete startedAt[account];

    console.log(`[${account}] Scheduler stopped`);
    return { message: "Scheduler stopped successfully", status: 'stopped' };
}

// Get scheduler status
function getSchedulerStatus(account) {
    const running = !!isSchedulerRunning[account];
    const job = currentJob[account];
    const next = job ? job.nextInvocation() : null;
    const start = startedAt[account] || null;
    const uptime = start ? Math.round((Date.now() - start.getTime()) / 60000) : null;
    return {
        status: running ? 'running' : 'stopped',
        startedAt: start,
        nextRun: next,
        uptime
    };
}

// Controller functions for API endpoints
const startSchedulerController = async (req, res) => {
    try {
        const account = (req.query.account || 'dreamchasers').toLowerCase();
        const result = startScheduler(account);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error starting scheduler:", error);
        res.status(500).json({ error: "Failed to start scheduler", details: error.message });
    }
};

const stopSchedulerController = async (req, res) => {
    try {
        const account = (req.query.account || 'dreamchasers').toLowerCase();
        const result = stopScheduler(account);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error stopping scheduler:", error);
        res.status(500).json({ error: "Failed to stop scheduler", details: error.message });
    }
};

const getSchedulerStatusController = async (req, res) => {
    try {
        const account = (req.query.account || 'dreamchasers').toLowerCase();
        const status = getSchedulerStatus(account);
        res.status(200).json(status);
    } catch (error) {
        console.error("Error getting scheduler status:", error);
        res.status(500).json({ error: "Failed to get scheduler status", details: error.message });
    }
};

// Manual post trigger (for testing)
const manualPostController = async (req, res) => {
    try {
        const account = (req.query.account || 'dreamchasers').toLowerCase();
        await postReel(account);
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
