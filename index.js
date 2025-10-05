require('dotenv').config();
require('cors')();
const express = require("express");
const app = express();

const dbConnect = require('./src/db');

const PORT = process.env.PORT || 8080;

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/posts', require('./src/routes/posts.routes'));
app.use('/api/upload', require('./src/routes/upload.routes'));
app.use('/api/scheduler', require('./src/routes/scheduler.routes')); // Legacy route - deprecated
app.use('/api/twitter', require('./src/routes/twitter.routes'));

// Platform-specific routes
app.use('/api/instagram', require('./src/routes/instagram.routes'));
app.use('/api/bluesky', require('./src/routes/bluesky.routes'));
app.use('/api/threads', require('./src/routes/threads.routes'));

app.get('/', (req, res) => {
    res.send('Welcome to the Media Poster API');
});

dbConnect().then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


