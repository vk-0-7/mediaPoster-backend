const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mediaposter';

if (!MONGODB_URI) {
    throw new Error(
        "Please define the MONGODB_URI environment variable"
    );
}


let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

async function dbConnect() {
    if (cached.conn) {
        console.log("Using existing MongoDB connection");
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
        };

        console.log("Creating new MongoDB connection...");
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("MongoDB connected successfully");
            return mongoose;
        }).catch((error) => {
            console.error("MongoDB connection error:", error);
            throw error;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

module.exports = dbConnect;
