const express = require("express");
const { Series } = require("../models/seriesMoudel");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const router = express.Router();
const HandelValidation = require("../Middleware/HandelValidation");
const {
  seriesValidation,
  create_editSeasonValidation,
  create_editEpisodeValidation,
  editSeriesValidation,
} = require("../user/controller/seriesValidation");

//get     checked
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    // Retrieve series from the database with pagination
    const series = await Series.find().skip(skip).limit(limit).lean();

    const seriesDocuments = series.map(
      (seriesObject) => new Series(seriesObject)
    );

    // Get the total count of documents in the Series collection
    const totalCount = await Series.countDocuments();

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: seriesDocuments.map((doc) => doc.toObject({ virtuals: true })),
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving series:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

//search    checked
router.get("/search", async (req, res) => {
  try {
    const term = req.query.Title;
    const series = await Series.find({
      Title: { $regex: term, $options: "i" },
    }).lean();
    if (series.length === 0) {
      return res.status(404).json("No series found");
    }
    const seriesDocuments = series.map(
      (seriesObject) => new Series(seriesObject)
    );
    res.json(seriesDocuments.map((doc) => doc.toObject({ virtuals: true })));
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//############## manga #################
//delete series   checked
router.delete("/:id", async (req, res) => {
  try {
    const series = await Series.findByIdAndDelete(req.params.id);
    if (!series) {
      return res.status(404).json({ msg: "series not found" });
    }
    res.json({ msg: "series deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//create series checked
router.post(
  "/createSeries",
  HandelValidation(seriesValidation),
  async (req, res) => {
    const {
      Title,
      Year,
      Released,
      Genre,
      Description,
      Language,
      Country,
      subtitle,
      Poster,
      Rating,
      seasonNumber,
      seasonName,
      seasonImage,
    } = req.body;

    // Create a new season document with the episode
    const newSeason = {
      number: seasonNumber,
      name: seasonName,
      image: seasonImage,
      Chapters: [],
    };
    // Create a new anime document with the season
    const newSeries = new Series({
      Title,
      Year,
      Released,
      Genre,
      Description,
      Language,
      Country,
      subtitle,
      Poster,
      Rating,
      Seasons: [newSeason],
    });
    // Save the new anime document to the database
    await newSeries.save();

    // Retrieve the newly created anime document
    const series = await Series.findById(newSeries._id);

    res.json({ msg: "series added successfully", series });
  }
);
//edit series checked
router.post(
  "/editSeries/:id",
  HandelValidation(editSeriesValidation),
  async (req, res) => {
    const seriesId = req.params.id;
    try {
      const {
        Title,
        Year,
        Released,
        Genre,
        Description,
        Language,
        Country,
        subtitle,
        Poster,
        Rating,
      } = req.body;
      const updatedSeries = await Series.findByIdAndUpdate(
        seriesId,
        {
          $set: {
            Title,
            Year,
            Released,
            Genre,
            Description,
            Language,
            Country,
            subtitle,
            Poster,
            Rating,
          },
        },
        { new: true }
      );

      if (!updatedSeries) {
        return res.status(404).json({
          msg: "Series not found",
        });
      }

      res.json({
        msg: "Series updated successfully",
        anime: updatedSeries,
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
//create season    checked
router.post("/createSeason/:id", async (req, res) => {
  const seriesId = req.params.id;
  const { number, name, image } = req.body; // assuming number and name are sent in the request body
  const newSeason = { number, name, image, Episodes: [] }; // add number and name to the newSeason object

  const updatedSeries = await Series.findOneAndUpdate(
    { _id: seriesId },
    { $push: { Seasons: newSeason } },
    { new: true }
  ).populate("Seasons.Episodes");

  res.json({
    msg: "Season added successfully",
    series: updatedSeries,
  });
});
//edit season  checked
router.post(
  "/editSeason/:seriesId/:seasonNumber",
  HandelValidation(create_editSeasonValidation),
  async (req, res) => {
    const { name, number, image } = req.body;
    const updatedSeason = { name, number, image };

    const updatedSeries = await Series.findOneAndUpdate(
      {
        _id: req.params.seriesId,
        "Seasons.number": req.params.seasonNumber,
      },
      { $set: { "Seasons.$": updatedSeason } },
      { new: true }
    ).populate("Seasons.Episodes");

    res.json({
      msg: "Season updated successfully",
      series: updatedSeries,
    });
  }
);
//delete season checked
router.delete("/deleteSeason/:seriesId/:seasonNumber", async (req, res) => {
  const updatedSeries = await Series.findOneAndUpdate(
    { _id: req.params.seriesId },
    { $pull: { Seasons: { number: req.params.seasonNumber } } }, // remove the season matching the seasonNumber parameter
    { new: true }
  ).populate("Seasons.Episodes");

  res.json({
    msg: "Season deleted successfully",
    series: updatedSeries,
  });
});
//############## episode #################
//crate episode  checked
router.post(
  "/createEpisode/:seriesId/:seasonNumber",
  HandelValidation(create_editEpisodeValidation),
  async (req, res) => {
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

    const updatedSeries = await Series.findOneAndUpdate(
      { _id: req.params.seriesId, "Seasons.number": req.params.seasonNumber },
      { $push: { "Seasons.$.Episodes": newEpisode } },
      { new: true }
    );

    res.json({
      msg: "Episode added successfully",
      series: updatedSeries,
    });
  }
);
// edit episode in season   checked
router.post(
  "/editEpisode/:seriesId/:seasonNumber/:episodeNumber",
  HandelValidation(create_editEpisodeValidation),
  async (req, res) => {
    const {
      Title,
      Year,
      Released,
      EpisodeNumber,
      Runtime,
      Genre,
      Description,
      Language,
      Country,
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
      Country,
      subtitle,
      Poster,
      Rating,
      VideoUrl,
    };

    const updatedSeries = await Series.findOneAndUpdate(
      {
        _id: req.params.seriesId,
        "Seasons.number": req.params.seasonNumber,
        "Seasons.Episodes.EpisodeNumber": req.params.episodeNumber,
      },
      {
        $set: { "Seasons.$[season].Episodes.$[episode]": updatedEpisode },
      },
      {
        new: true,
        arrayFilters: [
          {
            "season.number": req.params.seasonNumber,
          },
          {
            "episode.EpisodeNumber": parseInt(req.params.episodeNumber),
          },
        ],
      }
    );

    res.json({
      msg: "Episode updated successfully",
      series: updatedSeries,
    });
  }
);

//delete episode in season  checked
router.delete(
  "/deleteEpisode/:seriesId/:seasonNumber/:episodeNumber",
  async (req, res) => {
    const updatedSeries = await Series.findOneAndUpdate(
      {
        _id: req.params.seriesId,
        "Seasons.number": req.params.seasonNumber,
      },
      {
        $pull: {
          "Seasons.$.Episodes": {
            EpisodeNumber: req.params.episodeNumber,
          },
        },
      },
      { new: true }
    );

    res.json({
      msg: "Episode deleted successfully",
      series: updatedSeries,
    });
  }
);
//genre
const predefinedGenres = [
  "arabic",
  "english",
  "turkish",
  "hindi",
  "Spanish",
  "k-drama",
];

router.post("/genre", async (req, res) => {
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

    const seriesData = await Series.find(genreSearchQuery);

    if (seriesData.length === 0) {
      return res.status(404).json({ message: "No data found for the genre" });
    }

    res.json(seriesData);
  } catch (err) {
    console.error("Error during search:", err);
    res
      .status(500)
      .json({ message: "An error occurred while searching for series." });
  }
});
const GenreList = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "documentary",
  "drama",
  "family",
  "fantasy",
  "history",
  "horror",
  "music",
  "mystery",
  "romance",
  "science fiction",
  "thriller",
  "war",
  "western",
];
router.get("/genre/list", (req, res) => {
  res.json(GenreList);
});

router.get("/ar", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    const genreFilters = req.query.genre ? req.query.genre.split(",") : []; // Get genre filters as an array

    const country = "Arabic"; // Filter movies specifically for the country "Arabic"

    const genreSearchQuery = {
      $and: [{ Country: { $regex: country, $options: "i" } }],
    };

    if (genreFilters.length > 0) {
      const genreFilterQuery = {
        $and: genreFilters.map((genre) => ({
          $or: [
            { "Genre.type": { $regex: genre, $options: "i" } },
            { "Genre.category": { $regex: genre, $options: "i" } },
            { "Genre.subCategory": { $regex: genre, $options: "i" } },
          ],
        })),
      };
      genreSearchQuery.$and.push(genreFilterQuery);
    }

    // Retrieve movies from the database with pagination and filters
    const movieData = await Movie.find(genreSearchQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const movieDocuments = movieData.map(
      (movieObject) => new Movie(movieObject)
    );

    // Get the total count of movies with the applied filters
    const totalCount = await Movie.countDocuments(genreSearchQuery);

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (movieData.length === 0) {
      // Return a message if no movies are found with the applied filters
      return res.json({ message: "No movies found" });
    }

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: movieDocuments.map((doc) => doc.toObject({ virtuals: true })),
      totalVideos: totalCount,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving movies:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/en", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    const genreFilters = req.query.genre ? req.query.genre.split(",") : []; // Get genre filters as an array

    const country = "English"; // Filter movies specifically for the country "Arabic"

    const genreSearchQuery = {
      $and: [{ Country: { $regex: country, $options: "i" } }],
    };

    if (genreFilters.length > 0) {
      const genreFilterQuery = {
        $and: genreFilters.map((genre) => ({
          $or: [
            { "Genre.type": { $regex: genre, $options: "i" } },
            { "Genre.category": { $regex: genre, $options: "i" } },
            { "Genre.subCategory": { $regex: genre, $options: "i" } },
          ],
        })),
      };
      genreSearchQuery.$and.push(genreFilterQuery);
    }

    // Retrieve movies from the database with pagination and filters
    const movieData = await Movie.find(genreSearchQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const movieDocuments = movieData.map(
      (movieObject) => new Movie(movieObject)
    );

    // Get the total count of movies with the applied filters
    const totalCount = await Movie.countDocuments(genreSearchQuery);

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (movieData.length === 0) {
      // Return a message if no movies are found with the applied filters
      return res.json({ message: "No movies found" });
    }

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: movieDocuments.map((doc) => doc.toObject({ virtuals: true })),
      totalVideos: totalCount,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving movies:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/tur", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    const genreFilters = req.query.genre ? req.query.genre.split(",") : []; // Get genre filters as an array

    const country = "Turkish"; // Filter movies specifically for the country "Arabic"

    const genreSearchQuery = {
      $and: [{ Country: { $regex: country, $options: "i" } }],
    };

    if (genreFilters.length > 0) {
      const genreFilterQuery = {
        $and: genreFilters.map((genre) => ({
          $or: [
            { "Genre.type": { $regex: genre, $options: "i" } },
            { "Genre.category": { $regex: genre, $options: "i" } },
            { "Genre.subCategory": { $regex: genre, $options: "i" } },
          ],
        })),
      };
      genreSearchQuery.$and.push(genreFilterQuery);
    }

    // Retrieve movies from the database with pagination and filters
    const movieData = await Movie.find(genreSearchQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const movieDocuments = movieData.map(
      (movieObject) => new Movie(movieObject)
    );

    // Get the total count of movies with the applied filters
    const totalCount = await Movie.countDocuments(genreSearchQuery);

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (movieData.length === 0) {
      // Return a message if no movies are found with the applied filters
      return res.json({ message: "No movies found" });
    }

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: movieDocuments.map((doc) => doc.toObject({ virtuals: true })),
      totalVideos: totalCount,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving movies:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/hi", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    const genreFilters = req.query.genre ? req.query.genre.split(",") : []; // Get genre filters as an array

    const country = "Hindi"; // Filter movies specifically for the country "Arabic"

    const genreSearchQuery = {
      $and: [{ Country: { $regex: country, $options: "i" } }],
    };

    if (genreFilters.length > 0) {
      const genreFilterQuery = {
        $and: genreFilters.map((genre) => ({
          $or: [
            { "Genre.type": { $regex: genre, $options: "i" } },
            { "Genre.category": { $regex: genre, $options: "i" } },
            { "Genre.subCategory": { $regex: genre, $options: "i" } },
          ],
        })),
      };
      genreSearchQuery.$and.push(genreFilterQuery);
    }

    // Retrieve movies from the database with pagination and filters
    const movieData = await Movie.find(genreSearchQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const movieDocuments = movieData.map(
      (movieObject) => new Movie(movieObject)
    );

    // Get the total count of movies with the applied filters
    const totalCount = await Movie.countDocuments(genreSearchQuery);

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (movieData.length === 0) {
      // Return a message if no movies are found with the applied filters
      return res.json({ message: "No movies found" });
    }

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: movieDocuments.map((doc) => doc.toObject({ virtuals: true })),
      totalVideos: totalCount,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving movies:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/sp", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    const genreFilters = req.query.genre ? req.query.genre.split(",") : []; // Get genre filters as an array

    const country = "Spanish"; // Filter movies specifically for the country "Arabic"

    const genreSearchQuery = {
      $and: [{ Country: { $regex: country, $options: "i" } }],
    };

    if (genreFilters.length > 0) {
      const genreFilterQuery = {
        $and: genreFilters.map((genre) => ({
          $or: [
            { "Genre.type": { $regex: genre, $options: "i" } },
            { "Genre.category": { $regex: genre, $options: "i" } },
            { "Genre.subCategory": { $regex: genre, $options: "i" } },
          ],
        })),
      };
      genreSearchQuery.$and.push(genreFilterQuery);
    }

    // Retrieve movies from the database with pagination and filters
    const movieData = await Movie.find(genreSearchQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const movieDocuments = movieData.map(
      (movieObject) => new Movie(movieObject)
    );

    // Get the total count of movies with the applied filters
    const totalCount = await Movie.countDocuments(genreSearchQuery);

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (movieData.length === 0) {
      // Return a message if no movies are found with the applied filters
      return res.json({ message: "No movies found" });
    }

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: movieDocuments.map((doc) => doc.toObject({ virtuals: true })),
      totalVideos: totalCount,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving movies:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/k-drama", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    const genreFilters = req.query.genre ? req.query.genre.split(",") : []; // Get genre filters as an array

    const country = "k_drama"; // Filter movies specifically for the country "Arabic"

    const genreSearchQuery = {
      $and: [{ Country: { $regex: country, $options: "i" } }],
    };

    if (genreFilters.length > 0) {
      const genreFilterQuery = {
        $and: genreFilters.map((genre) => ({
          $or: [
            { "Genre.type": { $regex: genre, $options: "i" } },
            { "Genre.category": { $regex: genre, $options: "i" } },
            { "Genre.subCategory": { $regex: genre, $options: "i" } },
          ],
        })),
      };
      genreSearchQuery.$and.push(genreFilterQuery);
    }

    // Retrieve movies from the database with pagination and filters
    const movieData = await Movie.find(genreSearchQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const movieDocuments = movieData.map(
      (movieObject) => new Movie(movieObject)
    );

    // Get the total count of movies with the applied filters
    const totalCount = await Movie.countDocuments(genreSearchQuery);

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (movieData.length === 0) {
      // Return a message if no movies are found with the applied filters
      return res.json({ message: "No movies found" });
    }

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: movieDocuments.map((doc) => doc.toObject({ virtuals: true })),
      totalVideos: totalCount,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving movies:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
module.exports = router;
