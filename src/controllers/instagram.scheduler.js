const schedule = require("node-schedule");
const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require('mongoose');
const InstagramPost = require('../models/instagram.models');
// const { sendEmail } = require("../utils/email");
const { getPlatformConfig, getCustomCaption } = require("../utils/platformConfig");

const START_HOUR = 8 - 5.5;
const END_HOUR = 23 - 5.5;

let isSchedulerRunning = {};
let currentJob = {};
let startedAt = {};

dotenv.config();



async function postStories(videoUrl, account) {
    try {
        const { PAGE_ID, ACCESS_TOKEN } = getPlatformConfig('instagram', account);


        let containerId = null;

        try {
            const createRes = await axios.post(
                `https://graph.facebook.com/v23.0/${PAGE_ID}/media`,
                null,
                {
                    params: {
                        media_type: "STORIES",
                        video_url: videoUrl,
                        access_token: ACCESS_TOKEN,
                    }
                },
            );

            containerId = createRes.data.id;
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

        console.log(`🔥 Marked Story as posted.🔥`);

    } catch (error) {
        console.error("Error posting reel:", error.response?.data || error.message);
        // sendEmail('Instagram Post Error', `Error posting from account ${account}: ${error.message}`)
    }
}


async function postReel(account) {
    try {
        const { PAGE_ID, ACCESS_TOKEN } = getPlatformConfig('instagram', account);

        console.log(account);

        const unpostedPost = await InstagramPost.findOne({ isPosted: false, account: account });
        if (!unpostedPost) {
            console.log("No unposted content available");
            return;
        }

        const { videoUrl, caption } = unpostedPost;
        await postStories(videoUrl, account)
        let containerId = null;

        try {
            const createRes = await axios.post(
                `https://graph.facebook.com/v23.0/${PAGE_ID}/media`,
                null,
                {
                    params: {
                        media_type: "REELS",
                        video_url: videoUrl,
                        caption: getCustomCaption('instagram', account, caption),
                        share_to_feed: true,
                        access_token: ACCESS_TOKEN,
                    }
                },
            );

            containerId = createRes.data.id;
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
        // sendEmail('Instagram Post Error', `Error posting from account ${account}: ${error.message}`)
    }
}

// Generate random delay (in ms) between 3–6 hours
function getRandomDelay() {
    const hours = Math.floor(Math.random() * 4) + 3; // 3–6 hrs
    const minutes = Math.floor(Math.random() * 60);
    return (hours * 60 + minutes) * 60 * 1000; // ms
}

// Ensure time is inside allowed daytime window
function adjustToDaytime(nextTime) {
    const hour = nextTime.getHours();

    if (hour < START_HOUR) {
        const randomHour = Math.floor(Math.random() * 4) + START_HOUR;
        const randomMinute = Math.floor(Math.random() * 60);
        nextTime.setHours(randomHour, randomMinute, 0, 0);
    } else if (hour >= END_HOUR) {
        nextTime.setDate(nextTime.getDate() + 1);
        const randomHour = Math.floor(Math.random() * 4) + START_HOUR;
        const randomMinute = Math.floor(Math.random() * 60);
        nextTime.setHours(randomHour, randomMinute, 0, 0);
    }
    return nextTime;
}

// Recursive scheduler
function scheduleNextPost(account) {
    if (currentJob[account]) {
        currentJob[account].cancel();
        currentJob[account] = null;
    }

    const delay = getRandomDelay();
    const delayHours = Math.floor(delay / (1000 * 60 * 60));
    const delayMinutes = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));
    console.log(`[Instagram/${account}] Delay: ${delayHours}h ${delayMinutes}m`);

    let nextTime = new Date(Date.now() + delay);
    nextTime = adjustToDaytime(nextTime);

    console.log(`[Instagram/${account}] Next post scheduled at`, nextTime.toLocaleString());

    currentJob[account] = schedule.scheduleJob(nextTime, async () => {
        await postReel(account);
        if (isSchedulerRunning[account]) {
            scheduleNextPost(account);
        }
    });
}

function startScheduler(account) {
    if (isSchedulerRunning[account]) {
        return { message: "Scheduler is already running", status: 'running' };
    }

    if (currentJob[account]) {
        currentJob[account].cancel();
        currentJob[account] = null;
    }

    isSchedulerRunning[account] = true;
    startedAt[account] = new Date();

    scheduleNextPost(account);

    console.log(`[Instagram/${account}] Scheduler started successfully`);
    return { message: "Scheduler started successfully", status: 'running' };
}

function stopScheduler(account) {
    isSchedulerRunning[account] = false;

    if (currentJob[account]) {
        currentJob[account].cancel();
        currentJob[account] = null;
    }

    delete startedAt[account];

    console.log(`[Instagram/${account}] Scheduler stopped`);
    return { message: "Scheduler stopped successfully", status: 'stopped' };
}

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
        const account = req.query.account
        const result = startScheduler(account);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error starting scheduler:", error);
        res.status(500).json({ error: "Failed to start scheduler", details: error.message });
    }
};

const stopSchedulerController = async (req, res) => {
    try {
        const account = req.query.account 
        const result = stopScheduler(account);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error stopping scheduler:", error);
        res.status(500).json({ error: "Failed to stop scheduler", details: error.message });
    }
};

const getSchedulerStatusController = async (req, res) => {
    try {
        const account = req.query.account 
        const status = getSchedulerStatus(account);
        res.status(200).json(status);
    } catch (error) {
        console.error("Error getting scheduler status:", error);
        res.status(500).json({ error: "Failed to get scheduler status", details: error.message });
    }
};

const manualPostController = async (req, res) => {
    try {
        const account = req.query.account;
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
