const mongoose = require('mongoose');
const InstagramPost = require('../models/instagram.models');
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadVideoFromUrl(videoUrl, account) {
    try {
        const result = await cloudinary.uploader.upload(videoUrl, {
            resource_type: "video",
            folder: account 
        });
        return result.secure_url;
    } catch (error) {
        console.error("Error uploading video:", error);
    }
}


const uploadJSON = async (req, res) => {
    try {

        const data = req.body;


        const account = req.query.account;
        if (!account) {
            res.status(404).json({ success: false, message: "Please mention the account name " })
        }

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: 'Data must be an array of posts' });
        }

        // Validate and prepare data
        const validatedData = data.map((post, index) => {

            if (post.isPosted === undefined) {
                post.isPosted = false;
            }
            if (!post.account) {
                post.account = account;
            }
            return post;
        });


        const posts = await InstagramPost.insertMany(validatedData);

        // Update videoUrl if needed
        for (const post of posts) {
            if (post.videoUrl) {
                const uploadedUrl = await uploadVideoFromUrl(post.videoUrl, account);
                post.videoUrl = uploadedUrl;
                await post.save();
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
    //     try {
    //         const account = (req.query.account || 'dreamchasers').toLowerCase();
    //         const PostModel = getPostModelForAccount(account);
    //         const posts = await PostModel.find();
    //         res.status(200).json(posts);
    //     } catch (error) {
    //         console.error('Error getting posts:', error);
    //         res.status(500).json({
    //             error: 'Failed to get posts',
    //             details: error.message
    //         });
    //     }
};

module.exports = { uploadJSON, getPosts };
