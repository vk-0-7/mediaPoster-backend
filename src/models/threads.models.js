const mongoose = require('mongoose');

const ThreadsPostSchema = new mongoose.Schema({
    id: { type: String, required: true },
    isPosted: { type: Boolean, required: true, default: false },
    text: { type: String },
    timestamp: { type: Date },
    mediaUrl: { type: String },
    mediaType: { type: String }, // IMAGE, VIDEO, CAROUSEL
    permalink: { type: String },
    likeCount: { type: Number },
    replyCount: { type: Number },
});

const ThreadsPost = mongoose.model('ThreadsPost', ThreadsPostSchema);

module.exports = ThreadsPost;
