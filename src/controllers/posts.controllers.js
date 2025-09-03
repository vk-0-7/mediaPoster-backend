


const InstagramPost = require('../models/posts.models');
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



async function uploadVideoFromUrl(videoUrl) {
    try {
        const result = await cloudinary.uploader.upload(videoUrl, {
            resource_type: "video", // tell Cloudinary this is a video
            folder: "videos"
        });
        console.log("Uploaded video URL:", result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error("Error uploading video:", error);
    }
}

const uploadJSON = async (req, res) => {
    try {
        const { data } = req.body;

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
        const posts = await InstagramPost.insertMany(validatedData);

        // Now update videoUrl if needed
        for (const post of posts) {
            if (post.videoUrl) {
                const uploadedUrl = await uploadVideoFromUrl(post.videoUrl);
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
        const posts = await InstagramPost.find();
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error getting posts:', error);
    }
};

module.exports = { uploadJSON, getPosts };