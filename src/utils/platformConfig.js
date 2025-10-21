const dotenv = require("dotenv");
dotenv.config();

/**
 * Get API credentials for a specific platform and account
 * @param {string} platform - Platform name (instagram, twitter, bluesky, threads)
 * @param {string} account - Account name (dreamchasers, codingwithbugs, vallendros, etc.)
 * @returns {Object} Platform-specific credentials
 */
function getPlatformConfig(platform, account) {
    const normalizedPlatform = platform
    const normalizedAccount = account;

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
    const normalized = account;

    switch (normalized) {
        case 'coding_with_bugs':
            return {
                PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_CODINGWITHBUGS,
                ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_CODINGWITHBUGS,
            };

        case 'vallendros':
            return {
                PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_VELLANDROS,
                ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_VELLANDROS,
            };

        case 'dailyAIInsights':
            return {
                PAGE_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FOR_DAILY_AI_INSIGHTS,
                ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN_FOR_DAILY_AI_INSIGHTS,
            };

        case 'dream_chasers':
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
    const normalized = (account || 'maria').toLowerCase();

    switch (normalized) {
        case 'maria_in_tech':
            return {
                API_KEY: process.env.X_API_KEY_FOR_MARIA,
                API_SECRET: process.env.X_API_KEY_SECRET_FOR_MARIA,
                ACCESS_TOKEN: process.env.X_ACCESS_TOKEN_FOR_MARIA,
                ACCESS_SECRET: process.env.X_ACCESS_SECRET_FOR_MARIA,
                BEARER_TOKEN: process.env.X_BEARER_TOKEN_FOR_MARIA,
                CLIENT_ID: process.env.X_CLIENT_ID_MARIA,
                CLIENT_SECRET: process.env.X_CLIENT_SECRET_MARIA,
            };

        case 'me_divya':
            return {
                API_KEY: process.env.X_API_KEY_FOR_DIVYA,
                API_SECRET: process.env.X_API_KEY_SECRET_FOR_DIVYA,
                ACCESS_TOKEN: process.env.X_ACCESS_TOKEN_FOR_DIVYA,
                ACCESS_SECRET: process.env.X_ACCESS_SECRET_FOR_DIVYA,
                BEARER_TOKEN: process.env.X_BEARER_TOKEN_FOR_DIVYA,
                CLIENT_ID: process.env.X_CLIENT_ID_DIVYA,
                CLIENT_SECRET: process.env.X_CLIENT_SECRET_DIVYA,
            };

        default:
            // Default to Maria
            return {
                API_KEY: process.env.X_API_KEY_FOR_MARIA,
                API_SECRET: process.env.X_API_KEY_SECRET_FOR_MARIA,
                ACCESS_TOKEN: process.env.X_ACCESS_TOKEN_FOR_MARIA,
                ACCESS_SECRET: process.env.X_ACCESS_SECRET_FOR_MARIA,
                BEARER_TOKEN: process.env.X_BEARER_TOKEN_FOR_MARIA,
                CLIENT_ID: process.env.X_CLIENT_ID_MARIA,
                CLIENT_SECRET: process.env.X_CLIENT_SECRET_MARIA,
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
    const normalizedPlatform = (platform || '')
    const normalizedAccount = (account || '')

    if (normalizedPlatform === 'instagram') {
        switch (normalizedAccount) {
            case 'coding_with_bugs':
                return "👉 Follow @coding_with_bugs for your daily dose of tech humor #codingwithbugs #programmingmemes #developerhumor #coderslife #techmemes #funnydeveloper #softwareengineer #programmerlife";

            case 'vallendros':
            case 'vellandros':
                return `2025 will be our year ❤️🔥💸
Follow @vallendros and manifest now !!
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
                return `2025 will be our year ❤️🔥💸
Follow @vallendros and manifest now !!
-
-
-
DM for credits or removal 🤝
-
-
-
#motivation #inspiration #success #wealth #money #blessed #adrenaline #goal #achievement #vision #dream #`;

            default:
                return "";
        }
    }

    if (normalizedPlatform === 'twitter') {
        switch (normalizedAccount) {
            case 'maria_in_tech':
                // Tech career advice and coding tips
                const mariaCaptions = [
                    "Just shipped a feature that actually works on the first try. Is this what success feels like? 🚀\n\n#WebDev #CodingLife #TechTwitter",
                    "Hot take: Reading documentation is not a weakness. It's literally what it's there for.\n\n#DevCommunity #LearnToCode #100DaysOfCode",
                    "That feeling when your code passes all tests but you still don't trust it 👀\n\n#Programming #DevLife #SoftwareEngineering",
                    "Pro tip: Console.log() is debugging. Don't let anyone tell you otherwise.\n\n#JavaScript #WebDevelopment #CodeNewbie",
                    "Remember: Every senior dev was once a junior who refused to give up 💪\n\n#TechCareer #WomenInTech #DevCommunity",
                    "Your imposter syndrome is lying to you. You belong here. ✨\n\n#TechTwitter #WomenWhoCode #DevMotivation",
                    "Debugging: The art of being a detective in a crime you committed.\n\n#CodingHumor #DevLife #Programming",
                    "Sometimes the best code is the code you delete 🗑️\n\n#CleanCode #SoftwareEngineering #DevTips",
                    "If you're not breaking things, you're not learning fast enough.\n\n#LearnInPublic #CodeNewbie #TechTwitter",
                    "The secret to being a good developer? Google, Stack Overflow, and pure determination.\n\n#100DaysOfCode #DevCommunity #WebDev"
                ];
                return mariaCaptions[Math.floor(Math.random() * mariaCaptions.length)];

            case 'me_divya':
                // Career growth, productivity, and tech industry insights
                const divyaCaptions = [
                    "Your career growth isn't linear. Stop comparing your chapter 3 to someone else's chapter 20.\n\n#CareerAdvice #TechCareer #WomenInTech",
                    "Networking isn't about collecting contacts. It's about building genuine relationships.\n\n#CareerGrowth #TechCommunity #ProfessionalDevelopment",
                    "That job you think you're not ready for? Apply anyway. Let them decide.\n\n#CareerTips #TechJobs #MotivationMonday",
                    "Your side project doesn't need to be perfect. It needs to be started.\n\n#BuildInPublic #TechTwitter #SideHustle",
                    "Boundaries aren't selfish. They're essential for sustainable success.\n\n#WorkLifeBalance #TechLife #MentalHealth",
                    "You don't need to know everything. You need to know how to find answers.\n\n#ContinuousLearning #TechCareer #GrowthMindset",
                    "The best investment you can make is in yourself. Keep learning, keep growing.\n\n#PersonalDevelopment #TechIndustry #LifelongLearning",
                    "Saying 'I don't know, but I'll find out' is a strength, not a weakness.\n\n#TechLeadership #CareerAdvice #Authenticity",
                    "Your productivity doesn't define your worth. Rest is productive too.\n\n#BurnoutPrevention #TechCommunity #SelfCare",
                    "Dream big, start small, act now. That's how careers are built.\n\n#CareerGoals #TechMotivation #MondayMotivation"
                ];
                return divyaCaptions[Math.floor(Math.random() * divyaCaptions.length)];

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
