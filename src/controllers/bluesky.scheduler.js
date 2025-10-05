const schedule = require("node-schedule");
const dotenv = require("dotenv");
const mongoose = require('mongoose');
const BlueskyPost = require('../models/bluesky.models');
const { sendEmail } = require("../utils/email");
const { getPlatformConfig, getCustomCaption } = require("../utils/platformConfig");

const START_HOUR = 8 - 5.5;
const END_HOUR = 23 - 5.5;

let isSchedulerRunning = {};
let currentJob = {};
let startedAt = {};

dotenv.config();

function getPostModelForAccount(account) {
    const normalized = (account || 'default').toLowerCase();
    const collectionName = `BlueskyPost_${normalized}`;
    const modelName = `BlueskyPostModel_${normalized}`;
    return mongoose.models[modelName] || mongoose.model(modelName, BlueskyPost.schema, collectionName);
}

async function postToBluesky(account) {
    try {
        const config = getPlatformConfig('bluesky', account);
        const PostModel = getPostModelForAccount(account);

        const unpostedPost = await PostModel.findOne({ isPosted: false });
        if (!unpostedPost) {
            console.log("No unposted content available");
            return;
        }

        // TODO: Implement Bluesky posting logic here
        console.log("Bluesky posting not yet implemented");

        // await PostModel.findByIdAndUpdate(unpostedPost._id, { isPosted: true });

    } catch (error) {
        console.error("Error posting to Bluesky:", error.message);
        sendEmail('Bluesky Post Error', `Error posting from account ${account}: ${error.message}`)
    }
}

function getRandomDelay() {
    const hours = Math.floor(Math.random() * 4) + 3;
    const minutes = Math.floor(Math.random() * 60);
    return (hours * 60 + minutes) * 60 * 1000;
}

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

function scheduleNextPost(account) {
    if (currentJob[account]) {
        currentJob[account].cancel();
        currentJob[account] = null;
    }

    const delay = getRandomDelay();
    let nextTime = new Date(Date.now() + delay);
    nextTime = adjustToDaytime(nextTime);

    console.log(`[Bluesky/${account}] Next post scheduled at`, nextTime.toLocaleString());

    currentJob[account] = schedule.scheduleJob(nextTime, async () => {
        await postToBluesky(account);
        if (isSchedulerRunning[account]) {
            scheduleNextPost(account);
        }
    });
}

const startSchedulerController = async (req, res) => {
    try {
        const account = (req.query.account || 'default').toLowerCase();

        if (isSchedulerRunning[account]) {
            return res.status(200).json({ message: "Scheduler is already running", status: 'running' });
        }

        isSchedulerRunning[account] = true;
        startedAt[account] = new Date();
        scheduleNextPost(account);

        res.status(200).json({ message: "Scheduler started successfully", status: 'running' });
    } catch (error) {
        console.error("Error starting scheduler:", error);
        res.status(500).json({ error: "Failed to start scheduler", details: error.message });
    }
};

const stopSchedulerController = async (req, res) => {
    try {
        const account = (req.query.account || 'default').toLowerCase();

        isSchedulerRunning[account] = false;
        if (currentJob[account]) {
            currentJob[account].cancel();
            currentJob[account] = null;
        }
        delete startedAt[account];

        res.status(200).json({ message: "Scheduler stopped successfully", status: 'stopped' });
    } catch (error) {
        console.error("Error stopping scheduler:", error);
        res.status(500).json({ error: "Failed to stop scheduler", details: error.message });
    }
};

const getSchedulerStatusController = async (req, res) => {
    try {
        const account = (req.query.account || 'default').toLowerCase();
        const running = !!isSchedulerRunning[account];
        const job = currentJob[account];
        const next = job ? job.nextInvocation() : null;
        const start = startedAt[account] || null;
        const uptime = start ? Math.round((Date.now() - start.getTime()) / 60000) : null;

        res.status(200).json({
            status: running ? 'running' : 'stopped',
            startedAt: start,
            nextRun: next,
            uptime
        });
    } catch (error) {
        console.error("Error getting scheduler status:", error);
        res.status(500).json({ error: "Failed to get scheduler status", details: error.message });
    }
};

const manualPostController = async (req, res) => {
    try {
        const account = (req.query.account || 'default').toLowerCase();
        await postToBluesky(account);
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
