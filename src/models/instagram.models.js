const mongoose = require('mongoose');

const InstagramPostSchema = new mongoose.Schema({
    id: { type: String, required: true },
    isPosted: { type: Boolean, required: true, default: false },
    account: { type: String, require: true },
    type: { type: String, },
    caption: { type: String, },
    hashtags: { type: Array },
    mentions: { type: Array },
    commentsCount: { type: Number },
    latestComments: { type: Array },
    dimensionsHeight: { type: Number },
    dimensionsWidth: { type: Number },
    displayUrl: { type: String },
    images: { type: Array },
    videoUrl: { type: String },
    alt: { type: String },
    likesCount: { type: Number },
    videoViewCount: { type: Number },
    videoPlayCount: { type: Number },
    timestamp: { type: Date },
    videoDuration: { type: Number },
    musicInfo: {
        song_name: { type: String },
        audio_id: { type: String }
    },
});

// Check if model already exists before creating it
const InstagramPost = mongoose.models.InstagramPost || mongoose.model('InstagramPost', InstagramPostSchema);

module.exports = InstagramPost;
