const dotenv = require("dotenv");
dotenv.config();

/**
 * Get API credentials for a specific platform and account
 * @param {string} platform - Platform name (instagram, twitter, bluesky, threads)
 * @param {string} account - Account name (dreamchasers, codingwithbugs, vallendros, etc.)
 * @returns {Object} Platform-specific credentials
 */
function getPlatformConfig(platform, account) {
    const normalizedPlatform = (platform || '').toLowerCase();
    const normalizedAccount = (account || '').toLowerCase();

    switch (normalizedPlatform) {
        case 'instagram':
            return getInstagramConfig(normalizedAccount);

        case 'twitter':
            return getTwitterConfig(normalizedAccount);

        case 'bluesky':
            return getBlueskyConfig(normalizedAccount);

        case 'threads':
            return getThreadsConfig(normalizedAccount);

        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

/**
 * Get Instagram-specific credentials
 * @param {string} account - Account name
 * @returns {Object} Instagram credentials
 */
function getInstagramConfig(account) {
    const normalized = (account || '').toLowerCase();

    switch (normalized) {
        case 'codingwithbugs':
            return {
                PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_CODINGWITHBUGS,
                ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_CODINGWITHBUGS,
            };

        case 'vallendros':
        case 'vellandros':
            return {
                PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_VELLANDROS,
                ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_VELLANDROS,
            };

        case 'dailyaiinsights':
            return {
                PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_DAILY_AI_INSIGHTS,
                ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_DAILY_AI_INSIGHTS,
            };

        case 'dreamchasers':
        default:
            return {
                PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_DREAMCHASERS,
                ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_DREAMCAHSERS
            };
    }
}

/**
 * Get Twitter-specific credentials
 * @param {string} account - Account name
 * @returns {Object} Twitter credentials
 */
function getTwitterConfig(account) {
    const normalized = (account || '').toLowerCase();

    // Add Twitter account-specific credentials here
    switch (normalized) {
        default:
            return {
                API_KEY: process.env.TWITTER_API_KEY,
                API_SECRET: process.env.TWITTER_API_SECRET,
                ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
                ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
                BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
            };
    }
}

/**
 * Get Bluesky-specific credentials
 * @param {string} account - Account name
 * @returns {Object} Bluesky credentials
 */
function getBlueskyConfig(account) {
    const normalized = (account || '').toLowerCase();

    // Add Bluesky account-specific credentials here
    switch (normalized) {
        default:
            return {
                USERNAME: process.env.BLUESKY_USERNAME,
                PASSWORD: process.env.BLUESKY_PASSWORD,
                APP_PASSWORD: process.env.BLUESKY_APP_PASSWORD,
            };
    }
}

/**
 * Get Threads-specific credentials
 * @param {string} account - Account name
 * @returns {Object} Threads credentials
 */
function getThreadsConfig(account) {
    const normalized = (account || '').toLowerCase();

    // Add Threads account-specific credentials here
    switch (normalized) {
        default:
            return {
                ACCESS_TOKEN: process.env.THREADS_ACCESS_TOKEN,
                USER_ID: process.env.THREADS_USER_ID,
            };
    }
}

/**
 * Get platform-specific caption customization
 * @param {string} platform - Platform name
 * @param {string} account - Account name
 * @param {string} caption - Original caption
 * @returns {string} Customized caption
 */
function getCustomCaption(platform, account, caption) {
    const normalizedPlatform = (platform || '').toLowerCase();
    const normalizedAccount = (account || '').toLowerCase();

    if (normalizedPlatform === 'instagram') {
        switch (normalizedAccount) {
            case 'codingwithbugs':
                return caption + " #codingwithbugs";

            case 'vallendros':
            case 'vellandros':
                return `2025 will be our year ❤️🔥💸
Follow and manifest now !!
-
-
-
DM for credits or removal 🤝
-
-
-
#motivation #inspiration #success #wealth #money #blessed #adrenaline #goal #achievement #vision #dream #`;

            case 'dailyaiinsights':
                return caption + " #dailyaiinsights #ai #artificialintelligence #tech #innovation";

            case 'dreamchasers':
                return caption + " #dreamchasers";

            default:
                return caption;
        }
    }

    // For other platforms, return caption as-is (add customization as needed)
    return caption;
}

module.exports = {
    getPlatformConfig,
    getInstagramConfig,
    getTwitterConfig,
    getBlueskyConfig,
    getThreadsConfig,
    getCustomCaption
};
