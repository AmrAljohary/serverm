const express = require("express");
const { Anime } = require("../models/animeMoudel");
const router = express.Router();
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const multer = require("multer");
const HandelValidation = require("../Middleware/HandelValidation");
const {
    animeValidation,

    create_editSeasonValidation,
    create_editEpisodeValidation,
    editAnime,
} = require("../user/user.validation");

const upload = multer();
//get    checked   done
router.get("/", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        // Retrieve anime from the database with pagination
        const anime = await Anime.find().skip(skip).limit(limit).lean();

        const animeDocuments = anime.map((animeObject) => new Anime(animeObject));

        // Get the total count of documents in the Anime collection
        const totalCount = await Anime.countDocuments();

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);

        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//get admin   checked   done
router.get("/noPG", async(req, res) => {
    const anime = await Anime.find().lean();
    const animeDocuments = anime.map((animeObject) => new Anime(animeObject));
    res.json(animeDocuments.map((doc) => doc.toObject({ virtuals: true })));
});

//search    checked
router.get("/search", async(req, res) => {
    try {
        const term = req.query.Title;
        const anime = await Anime.find({
            Title: { $regex: term, $options: "i" },
        }).lean();
        if (anime.length === 0) {
            return res.status(404).json("No anime found");
        }
        const animeDocuments = anime.map((animeObject) => new Anime(animeObject));
        res.json(animeDocuments.map((doc) => doc.toObject({ virtuals: true })));
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});
//############## anime #################
//delete anime checked    done
router.delete("/:id", async(req, res) => {
    try {
        const anime = await Anime.findByIdAndDelete(req.params.id);
        if (!anime) {
            return res.status(404).json({ msg: "anime not found" });
        }
        res.json({ msg: "anime deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

//create anime checked   done
router.post(
    "/createAnime",
    upload.none(),
    HandelValidation(animeValidation),
    async(req, res) => {
        const {
            Title,
            Year,
            Released,
            Genre,
            Description,
            Language,
            subtitle,
            Poster,
            Rating,
            seasonNumber,
            seasonName,
            seasonImage,
        } = req.body;
        console.log(req.body);

        // Create a new season document with the episode
        const newSeason = {
            number: seasonNumber,
            name: seasonName,
            image: seasonImage,
            Episodes: [],
        };

        // Create a new anime document with the season
        const newAnime = new Anime({
            Title,
            Year,
            Released,
            Genre,
            Description,
            Language,
            subtitle,
            Poster,
            Rating,
            Seasons: [newSeason],
        });

        // Save the new anime document to the database
        await newAnime.save();

        // Retrieve the newly created anime document
        const anime = await Anime.findById(newAnime._id);

        res.json({ msg: "Anime added successfully", anime });
    }
);

//edit anime checked
router.post(
    "/editAnime/:id",
    upload.none(),
    HandelValidation(editAnime),
    async(req, res) => {
        const animeId = req.params.id;
        try {
            const {
                Title,
                Year,
                Released,
                Genre,
                Description,
                Language,
                subtitle,
                Poster,
                Rating,
            } = req.body;
            const updatedAnime = await Anime.findByIdAndUpdate(
                animeId, {
                    $set: {
                        Title,
                        Year,
                        Released,
                        Genre,
                        Description,
                        Language,
                        subtitle,
                        Poster,
                        Rating,
                    },
                }, { new: true }
            );
            console.log(updatedAnime);

            if (!updatedAnime) {
                return res.status(404).json({
                    msg: "Anime not found",
                });
            }

            res.json({
                msg: "Anime updated successfully",
                anime: updatedAnime,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                msg: "Server error",
            });
        }
    }
);
//############## season #################

//get season

//create season    checked
router.post(
    "/createSeason/:id",
    upload.none(),
    HandelValidation(create_editSeasonValidation),
    async(req, res) => {
        console.log(req.body);
        const animeId = req.params.id;
        const { number, name, image } = req.body; // assuming number and name are sent in the request body
        const newSeason = { number, name, image, Episodes: [] }; // add number and name to the newSeason object

        const updatedAnime = await Anime.findOneAndUpdate({ _id: animeId }, { $push: { Seasons: newSeason } }, { new: true }).populate("Seasons.Episodes");

        res.json({
            msg: "Season added successfully",
            anime: updatedAnime,
        });
    }
);
//edit season  checked
router.post(
    "/editSeason/:animeId/:seasonNumber",
    upload.none(),
    HandelValidation(create_editSeasonValidation),
    async(req, res) => {
        const { name, number, image } = req.body;
        const updatedSeason = { name, number, image };

        const updatedAnime = await Anime.findOneAndUpdate({
            _id: req.params.animeId,
            "Seasons.number": req.params.seasonNumber,
        }, { $set: { "Seasons.$": updatedSeason } }, { new: true }).populate("Seasons.Episodes");

        res.json({
            msg: "Season updated successfully",
            anime: updatedAnime,
        });
    }
);
//delete season checked
router.delete("/deleteSeason/:animeId/:seasonNumber", async(req, res) => {
    const updatedAnime = await Anime.findOneAndUpdate({ _id: req.params.animeId }, { $pull: { Seasons: { number: req.params.seasonNumber } } }, // remove the season matching the seasonNumber parameter
        { new: true }
    ).populate("Seasons.Episodes");

    res.json({
        msg: "Season deleted successfully",
        anime: updatedAnime,
    });
});
//############## episode #################
//crate episode    checked
router.post(
    "/createEpisode/:animeId/:seasonNumber",
    upload.none(),
    HandelValidation(create_editEpisodeValidation),
    async(req, res) => {
        const {
            Title,
            Year,
            Released,
            Runtime,
            Genre,
            Description,
            Language,
            subtitle,
            Poster,
            Rating,
            VideoUrl,
            EpisodeNumber,
        } = req.body;
        const newEpisode = {
            Title,
            Year,
            Released,
            Runtime,
            Genre,
            Description,
            Language,
            subtitle,
            Poster,
            Rating,
            VideoUrl,
            EpisodeNumber,
        };

        const updatedAnime = await Anime.findOneAndUpdate({ _id: req.params.animeId, "Seasons.number": req.params.seasonNumber }, { $push: { "Seasons.$.Episodes": newEpisode } }, { new: true });

        res.json({
            msg: "Episode added successfully",
            anime: updatedAnime,
        });
    }
);
// edit episode in season     checked
router.post(
    "/editEpisode/:animeId/:seasonNumber/:episodeNumber",
    upload.none(),
    HandelValidation(create_editEpisodeValidation),
    async(req, res) => {
        const {
            Title,
            Year,
            Released,
            EpisodeNumber,
            Runtime,
            Genre,
            Description,
            Language,
            subtitle,
            Poster,
            Rating,
            VideoUrl,
        } = req.body;

        const updatedEpisode = {
            Title,
            Year,
            Released,
            EpisodeNumber,
            Runtime,
            Genre,
            Description,
            Language,
            subtitle,
            Poster,
            Rating,
            VideoUrl,
        };

        const updatedAnime = await Anime.findOneAndUpdate({
            _id: req.params.animeId,
            "Seasons.number": req.params.seasonNumber,
            "Seasons.Episodes.EpisodeNumber": req.params.episodeNumber,
        }, { $set: { "Seasons.$[season].Episodes.$[episode]": updatedEpisode } }, {
            new: true,
            arrayFilters: [
                { "season.number": req.params.seasonNumber },
                { "episode.EpisodeNumber": req.params.episodeNumber },
            ],
        });

        res.json({
            msg: "Episode updated successfully",
            anime: updatedAnime,
        });
    }
);
//delete episode in season checked
router.delete(
    "/deleteEpisode/:animeId/:seasonNumber/:episodeNumber",
    async(req, res) => {
        const updatedAnime = await Anime.findOneAndUpdate({
            _id: req.params.animeId,
            "Seasons.number": req.params.seasonNumber,
        }, {
            $pull: {
                "Seasons.$.Episodes": { EpisodeNumber: req.params.episodeNumber },
            },
        }, { new: true });

        res.json({
            msg: "Episode deleted successfully",
            anime: updatedAnime,
        });
    }
);
//get gener checked
const predefinedGenres = [
    "action",
    "shounen",
    "comedy",
    "drama",
    "magic",
    "fantasy",
    "romance",
    "horror",
    "school",
];
router.post("/genre", async(req, res) => {
    const genre = req.body.genre;
    if (!genre) {
        return res.status(400).json({ message: "Genre field is missing" });
    }

    const lowercaseGenre = genre.toLowerCase();
    if (!predefinedGenres.includes(lowercaseGenre)) {
        return res.status(400).json({ message: "Invalid genre" });
    }

    try {
        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        const animeData = await Anime.find(genreSearchQuery);

        if (animeData.length === 0) {
            return res.status(404).json({ message: "No data found for the genre" });
        }

        res.json(animeData);
    } catch (err) {
        console.error("Error during search:", err);
        res
            .status(500)
            .json({ message: "An error occurred while searching for anime." });
    }
});

//action genere
router.get("/action", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "action"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving action anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/shounen", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "shounen"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving shounen anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/comedy", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "comedy"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving comedy anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/drama", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "drama"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving drama anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/magic", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "magic"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving magic anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/fantasy", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "fantasy"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving fantasy anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/romance", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "romance"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving romance anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/horror", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "horror"; // Assuming you want to retrieve action anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve action anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of action anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving horror anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});
//action genere
router.get("/school", async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 10; // Number of results per page

        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;

        const lowercaseGenre = "school"; // Assuming you want to retrieve school anime

        const genreSearchQuery = {
            $or: [
                { "Genre.Type": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.Category": { $regex: lowercaseGenre, $options: "i" } },
                { "Genre.SubCategory": { $regex: lowercaseGenre, $options: "i" } },
            ],
        };

        // Retrieve school anime from the database with pagination
        const animeData = await Anime.find(genreSearchQuery)
            .skip(skip)
            .limit(limit)
            .lean();

        const animeDocuments = animeData.map(
            (animeObject) => new Anime(animeObject)
        );

        // Get the total count of school anime
        const totalCount = await Anime.countDocuments(genreSearchQuery);

        // Calculate the total number of pages based on the totalCount and limit
        const totalPages = Math.ceil(totalCount / limit);
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (animeData.length === 0) {
            // Return a message if no school anime data is found
            return res.json({ message: "No data founded" });
        }
        if (page > totalPages) {
            // Return a message indicating the last available page
            return res.json({
                message: `Invalid page number. The last available page is ${totalPages}`,
            });
        }

        res.json({
            data: animeDocuments.map((doc) => doc.toObject({ virtuals: true })),
            totalVideos: totalCount,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error retrieving school anime:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});

module.exports = router;