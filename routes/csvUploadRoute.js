const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const fs = require("fs");
const router = express.Router();
const mongoose = require("mongoose");
const { Anime } = require("../models/animeMoudel");
const { Manga } = require("../models/mangaMoudel");
const { Movie } = require("../models/movieMoudel");
const { Series } = require("../models/seriesMoudel");
const upload = multer({ dest: "uploads/" });

router.post("/csvUpload", upload.single("file"), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "File is required" });
        }
        const filePath = req.file.path;
        let jsonData;

        if (req.file.mimetype === "text/csv") {
            jsonData = await parseCSV(filePath);
        } else if (
            req.file.mimetype ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
            jsonData = await parseExcel(filePath);
        } else {
            return res.status(400).json({ error: "Unsupported file format" });
        }

        // Get the collection name from the request body
        const collectionName = req.body.collectionName;

        if (!collectionName) {
            return res.status(400).json({ error: "Collection name is required" });
        }

        // Check if the specified collection exists in mongoose models
        if (!mongoose.modelNames().includes(collectionName)) {
            return res.status(404).json({ error: "Collection not found" });
        }

        // Choose the appropriate model based on the collectionName
        let model;
        switch (collectionName) {
            case "anime":
                model = Anime;
                break;
            case "manga":
                model = Manga;
                break;
            case "movie":
                model = Movie;
                break;
            case "series":
                model = Series;
                break;
            default:
                return res.status(404).json({ error: "Invalid collection name" });
        }

        // Save the parsed data to the specified collection
        await model.insertMany(jsonData);

        return res
            .status(200)
            .json({ message: "Data received and processed successfully." });
    } catch (error) {
        console.error("Error parsing file data:", error);
        return res.status(400).json({ error: "Error parsing file data." });
    }
});

function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => {
                resolve(results);
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

function parseExcel(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            resolve(sheetData);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = router;