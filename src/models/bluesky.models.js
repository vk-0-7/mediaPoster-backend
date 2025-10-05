const mongoose = require('mongoose');

const BlueskyPostSchema = new mongoose.Schema({
    id: { type: String, required: true },
    isPosted: { type: Boolean, required: true, default: false },
    text: { type: String },
    createdAt: { type: Date },
    author: {
        handle: { type: String },
        displayName: { type: String },
    },
    replyCount: { type: Number },
    repostCount: { type: Number },
    likeCount: { type: Number },
    embed: {
        type: { type: String },
        images: { type: Array },
    },
});

const BlueskyPost = mongoose.model('BlueskyPost', BlueskyPostSchema);

module.exports = BlueskyPost;
