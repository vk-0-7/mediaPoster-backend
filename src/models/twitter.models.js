const mongoose = require('mongoose');

const TwitterPostSchema = new mongoose.Schema({
    tweetId: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    account: { type: String },
    author: {
        id: { type: String },
        username: { type: String },
        name: { type: String }
    },
    createdAt: { type: Date },
    metrics: {
        likes: { type: Number, default: 0 },
        retweets: { type: Number, default: 0 },
        replies: { type: Number, default: 0 },
        views: { type: Number, default: 0 }
    },
    aiAnalysis: {
        score: { type: Number }, // AI rating 1-10
        summary: { type: String },
        category: { type: String }, // e.g., "motivational", "technical", "humorous"
        reasoning: { type: String }
    },
    isSelected: { type: Boolean, default: false },
    isPosted: { type: Boolean, default: false },
    queuePosition: { type: Number, default: null }, // Position in posting queue (1, 2, 3...)
    scheduledFor: { type: Date },
    postedAt: { type: Date },
    postType: { type: String, default: 'feed' } // 'feed', 'buildinpublic', 'startup', 'softwareengineering'
}, {
    timestamps: true
});

// Base model for default collection
const TwitterPost = mongoose.models.TwitterPost || mongoose.model('TwitterPost', TwitterPostSchema);



module.exports = TwitterPost;
