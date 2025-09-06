


const mongoose = require('mongoose');
const InstagramPost = require('../models/posts.models');
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



async function uploadVideoFromUrl(videoUrl, account) {
    try {
        const result = await cloudinary.uploader.upload(videoUrl, {
            resource_type: "video", // tell Cloudinary this is a video
            folder: account === "dreamchasers" ? `videos/${account}` : "videos"
        });
        console.log("Uploaded video URL:", result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error("Error uploading video:", error);
    }
}

function getPostModelForAccount(account) {
    const normalized = (account || 'dreamchasers').toLowerCase();
    const collectionName = normalized === "dreamchasers" ? `InstagramPost_${normalized}` : `InstagramPost`;
    const modelName = normalized === "dreamchasers" ? `InstagramPostModel_${normalized}` : `InstagramPostModel`;
    return mongoose.models[modelName] || mongoose.model(modelName, InstagramPost.schema, collectionName);
}

const uploadJSON = async (req, res) => {
    try {
        const { data } = req.body;
        const account = req.query.account || req.body.account || null;

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: 'Data must be an array of posts' });
        }

        // Validate and prepare data
        const validatedData = data.map((post, index) => {
            if (!post.id) {
                post.id = `post_${Date.now()}_${index}`;
            }
            if (post.isPosted === undefined) {
                post.isPosted = false;
            }
            return post;
        });

        // Save posts to DB
        const PostModel = getPostModelForAccount(account);
        const posts = await PostModel.insertMany(validatedData);

        // Now update videoUrl if needed
        for (const post of posts) {
            if (post.videoUrl) {
                const uploadedUrl = await uploadVideoFromUrl(post.videoUrl, account);
                post.videoUrl = uploadedUrl;
                await post.save(); // saves directly
            }
        }

        res.status(200).json({
            message: 'Posts uploaded successfully',
            count: posts.length,
            posts
        });

    } catch (error) {
        console.error('Error uploading posts:', error);
        res.status(500).json({
            error: 'Failed to upload posts',
            details: error.message
        });
    }
};

const getPosts = async (req, res) => {
    try {
        const account = (req.query.account || 'dreamchasers').toLowerCase();
        const PostModel = getPostModelForAccount(account);
        const posts = await PostModel.find();
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error getting posts:', error);
    }
};

module.exports = { uploadJSON, getPosts };