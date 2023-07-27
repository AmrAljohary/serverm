const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const movieRoutes = require("./routes/movieRoute");
const animeRoutes = require("./routes/animeRoute");
const mangaRoutes = require("./routes/mangaRoute");
const photosRoutes = require("./routes/photosRoute");
const seriesRoutes = require("./routes/seriesRoute");
const songsRoutes = require("./routes/songsRoute");
const adminRouter = require("./routes/adminRoute");
const Links = require("./routes/linksRoute");
const upload = require("./routes/uploadRouter");
const csvUpload = require("./routes/csvUploadRoute");
const app = express();
const listEndpoints = require("express-list-endpoints");
const { MongoClient } = require("mongodb");
const { Anime } = require("./models/animeMoudel");
const { Movie } = require("./models/movieMoudel");
const { Series } = require("./models/seriesMoudel");
const { Manga } = require("./models/mangaMoudel");
const { Photos } = require("./models/photosMoudel");
const { Songs } = require("./models/songsMoudel");
const Admin = require("./models/adminMoudel");
const connection = process.env.CONNICTION_STRING;

app.use(cors());
const bcrypt = require("bcrypt");
const Joi = require("joi");
const authMiddleware = require("./Middleware/authMiddleware");
app.use(express.json());
// const apiKeyLength = 32;
// const characters =
//   "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// // Function to generate a new API key
// function generateNewApiKey() {
//   let apiKey = "";

//   for (let i = 0; i < apiKeyLength; i++) {
//     apiKey += characters.charAt(Math.floor(Math.random() * characters.length));
//   }

//   return apiKey;
// }

// // Endpoint to generate a new API key
// app.post("/generateApiKey", async (req, res) => {
//   try {
//     const db = getDB();
//     const collection = db.collection("apiKeys");

//     const existingApiKey = await collection.findOne();
//     let apiKey;

//     if (existingApiKey) {
//       apiKey = generateNewApiKey();
//       await collection.updateOne({}, { $set: { key: apiKey } });
//     } else {
//       apiKey = generateNewApiKey();
//       await collection.insertOne({ key: apiKey });
//     }

//     res.json({ apiKey });
//   } catch (error) {
//     console.error(
//       "Failed to store or retrieve API key from the database:",
//       error
//     );
//     res.status(500).json({ error: "Failed to generate or store API key" });
//   }
// });

connectDB();

app.use(express.urlencoded({ extended: true }));

//check of api key and select route that not use api key
// app.use(async(req, res, next) => {
//     const allowedRoutesWithoutApiKey = ["/generateApiKey"]; // Add the routes that can work without an API key

//     if (allowedRoutesWithoutApiKey.includes(req.path)) {
//         // Allow the specified routes to work without an API key
//         res.setHeader("Access-Control-Allow-Origin", "*");
//         res.setHeader(
//             "Access-Control-Allow-Methods",
//             "GET, POST, PUT, PATCH, DELETE"
//         );
//         res.setHeader(
//             "Access-Control-Allow-Headers",
//             "Content-Type, Authorization, api-key"
//         );
//         next();
//     } else {
//         // Check for the presence of API key
//         const requestApiKey = req.headers["api-key"];

//         if (!requestApiKey) {
//             res.status(401).json({ error: "API key is missing" });
//             return;
//         }

//         try {
//             const db = getDB();
//             const collection = db.collection("apiKeys");
//             const storedApiKey = await collection.findOne({ key: requestApiKey });

//             if (storedApiKey) {
//                 next();
//             } else {
//                 res.status(401).json({ error: "Invalid API key" });
//             }
//         } catch (error) {
//             console.error("Failed to retrieve API key from the database:", error);
//             res.status(500).json({ error: "Failed to retrieve API key" });
//         }
//     }
// });

// Define a route for searching
app.get("/search", async(req, res) => {
    try {
        // Get the search query parameter from the request URL
        const query = req.query.q;

        // Connection URL
        const url = connection;

        // Database Name
        const dbName = "data";

        // Array of collection names to include in the search
        const allowedCollections = [
            "anime",
            "manga",
            "movie",
            "photos",
            "series",
            "songs",
        ];

        // Create a new MongoClient
        const client = new MongoClient(url);

        // Connect to the MongoDB server
        await client.connect();

        // Get the database object
        const db = client.db(dbName);

        // Get the collections in the database
        const collections = await db.listCollections().toArray();

        // Array to store the search results
        const searchResults = [];

        // Iterate over each collection and perform the search operation
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;

            // Check if the current collection is allowed for searching
            if (allowedCollections.includes(collectionName)) {
                const collection = db.collection(collectionName);

                // Create a regex pattern for partial matching
                const regexQuery = new RegExp(query, "i");

                // Perform the search operation in the current collection
                const results = await collection
                    .find({ Title: { $regex: regexQuery } })
                    .toArray();

                // Add the results to the searchResults array
                searchResults.push({
                    collection: collectionName,
                    results: results,
                });
            }
        }

        // Close the MongoDB connection
        await client.close();

        res.json({ results: searchResults });
    } catch (error) {
        console.error("Error executing search operation:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
// Define a route for query
app.get("/query", async(req, res) => {
    try {
        // Get the genre query parameter from the request URL
        const genreQuery = req.query.genre;

        // Connection URL
        const url = connection;

        // Database Name
        const dbName = "data";

        // Array of collection names to include in the search
        const allowedCollections = [
            "anime",
            "manga",
            "movie",
            "photos",
            "series",
            "songs",
        ];

        // Create a new MongoClient
        const client = new MongoClient(url);

        // Connect to the MongoDB server
        await client.connect();

        // Get the database object
        const db = client.db(dbName);

        // Get the collections in the database
        const collections = await db.listCollections().toArray();

        // Array to store the search results
        const searchResults = [];

        // Iterate over each collection and perform the search operation
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;

            // Check if the current collection is allowed for searching
            if (allowedCollections.includes(collectionName)) {
                const collection = db.collection(collectionName);

                // Create a regex pattern for partial matching
                const regexQuery = new RegExp(genreQuery, "i");

                // Build the genre search criteria
                const genreSearchQuery = {
                    $or: [
                        { "Genre.Type": { $regex: regexQuery } },
                        { "Genre.Category": { $regex: regexQuery } },
                        { "Genre.SubCategory": { $regex: regexQuery } },
                    ],
                };

                // Perform the search operation in the current collection based on the genre
                const results = await collection.find(genreSearchQuery).toArray();

                // Add the results to the searchResults array
                searchResults.push({
                    collection: collectionName,
                    results: results,
                });
            }
        }

        // Close the MongoDB connection
        await client.close();

        res.json({ results: searchResults });
    } catch (error) {
        console.error("Error executing search operation:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//get  count of data
app.get("/count", async(req, res) => {
    try {
        const animeCount = await Anime.countDocuments();
        const movieCount = await Movie.countDocuments();
        const seriesCount = await Series.countDocuments();
        const mangaCount = await Manga.countDocuments();
        const photosCount = await Photos.countDocuments();
        const songsCount = await Songs.countDocuments();
        const adminCount = await Admin.countDocuments();

        res.status(200).json({
            message: "Protected data for admin",
            admin: req.admin,
            anime: animeCount,
            movie: movieCount,
            series: seriesCount,
            manga: mangaCount,
            photos: photosCount,
            songs: songsCount,
            admin: adminCount,
        });
    } catch (error) {
        console.error("Error retrieving counts:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});
app.use("/movie", movieRoutes);
app.use("/anime", animeRoutes);
app.use("/manga", mangaRoutes);
app.use("/photos", photosRoutes);
app.use("/series", seriesRoutes);
app.use("/songs", songsRoutes);
app.use("/admin", adminRouter);
app.use("/data", Links);
app.use("", upload);
app.use("", csvUpload);
// Get the list of endpoints
// const endpoints = listEndpoints(app);
const crypto = require("crypto");


// Log the list of endpoints
// console.log(endpoints);
app.listen(8000, () => {
    console.log("Server is listening on port 8000");
});