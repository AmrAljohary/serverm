const express = require("express");
const { Movie } = require("../models/movieMoudel");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const Joi = require("joi");
const router = express.Router();
const multer = require("multer");

const HandelValidation = require("../Middleware/HandelValidation");
const {
  create_series_movieValidation,
  editseriesValidation,
} = require("../user/controller/movieValidation");
const upload = multer();

//get    checked
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Number of results per page

    // Calculate the skip value based on the page and limit
    const skip = (page - 1) * limit;

    // Retrieve movies from the database with pagination
    const movies = await Movie.find().skip(skip).limit(limit).lean();

    // Get the total count of documents in the Movie collection
    const totalCount = await Movie.countDocuments();

    // Calculate the total number of pages based on the totalCount and limit
    const totalPages = Math.ceil(totalCount / limit);

    if (page > totalPages) {
      // Return a message indicating the last available page
      return res.json({
        message: `Invalid page number. The last available page is ${totalPages}`,
      });
    }

    res.json({
      data: movies,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error retrieving movies:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
//rating
router.get("/topRated", async (req, res) => {
  try {
    const movies = await Movie.find().sort({ Rating: -1 });
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//date
router.get("/date", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate start date and end date
    if (!startDate || !endDate || startDate > endDate) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const movies = await Movie.find({
      $expr: {
        $and: [
          { $gte: [{ $toDate: "$Released" }, new Date(startDate)] },
          { $lte: [{ $toDate: "$Released" }, new Date(endDate)] },
        ],
      },
    });

    // Check if no movies found
    if (movies.length === 0) {
      return res.status(404).json({ message: "No movies found" });
    }

    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//most resent
router.get("/latest", async (req, res) => {
  try {
    const movies = await Movie.find().sort({ Released: -1 });
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//slider
router.get("/slider", async (req, res) => {
  try {
    const movies = await Movie.find().sort({ Released: -1 }).limit(10);
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//delete   checked
router.delete("/:id", async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) {
      return res.status(404).json({ msg: "Movie not found" });
    }
    res.json({ msg: "Movie deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
// create    checked
router.post(
  "/add",
  upload.none(),
  HandelValidation(create_series_movieValidation),
  async (req, res) => {
    const {
      Title,
      Year,
      Released,
      Runtime,
      Genre,
      Description,
      Language,
      Country,
      Poster,
      Rating,
      VideoUrl,
      series,
    } = req.body;

    const newMovie = new Movie({
      Title,
      Year,
      Released,
      Runtime,
      Genre,
      Description,
      Language,
      Country,
      Poster,
      Rating,
      VideoUrl,
      series,
    });

    await newMovie.save();

    res.json({ msg: "Movie added successfully", movie: newMovie });
  }
);
// create series    checked
router.post(
  "/createSeries/:id",
  HandelValidation(editseriesValidation),
  async (req, res) => {
    const movieId = req.params.id;

    const {
      Title,
      Year,
      Released,
      Runtime,
      Genre,
      Description,
      Language,
      Country,
      Poster,
      Rating,
      VideoUrl,
      series,
    } = req.body;

    const newSeries = {
      Title,
      Year,
      Released,
      Runtime,
      Genre,
      Description,
      Language,
      Country,
      Poster,
      Rating,
      VideoUrl,
      series,
    };

    const updatedMovie = await Movie.findOneAndUpdate(
      { _id: movieId },
      { $push: { series: newSeries } },
      { new: true }
    );

    res.json({ msg: "Series added successfully", movie: updatedMovie });
  }
);
// edit series    checked
router.post("/updateSeries/:id/:seriesIndex", async (req, res, next) => {
  const id = req.params.id;
  const seriesIndex = req.params.seriesIndex;
  const {
    Title,
    Year,
    Released,
    Runtime,
    Genre,
    Description,
    Language,
    Country,
    Poster,
    Rating,
    VideoUrl,
  } = req.body;

  try {
    const objectId = new ObjectId(id);
    const movie = await Movie.findById(id);
    console.log(movie);
    if (!movie) {
      return res.status(404).send("Movie not found");
    }

    const series = movie.series[seriesIndex];
    console.log(series);
    if (!series) {
      return res.status(404).send("Series not found");
    }

    series.Title = Title || series.Title;
    series.Year = Year || series.Year;
    series.Released = Released || series.Released;
    series.Runtime = Runtime || series.Runtime;
    series.Genre = Genre || series.Genre;
    series.Description = Description || series.Description;
    series.Language = Language || series.Language;
    series.Poster = Poster || series.Poster;
    series.Rating = Rating || series.Rating;
    series.VideoUrl = VideoUrl || series.VideoUrl;

    await movie.save();

    res.json({ msg: "Series updated successfully", series });
  } catch (error) {
    return next(error);
  }
});
//delete series   checked
router.delete("/:id/:seriesIndex", async (req, res) => {
  try {
    const id = req.params.id;
    const seriesIndex = req.params.seriesIndex;
    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({ msg: "Movie not found" });
    }

    const series = movie.series[seriesIndex];
    if (!series) {
      return res.status(404).json({ msg: "Series not found" });
    }

    movie.series.splice(seriesIndex, 1); // remove the series from the array

    await movie.save(); // save the updated movie object to the database

    res.json({ msg: "Series deleted successfully", series });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//edit    checked
router.post("/:id", async (req, res, next) => {
  const id = req.params.id;
  const {
    Title,
    Year,
    Released,
    Runtime,
    Genre,
    Description,
    Language,
    Country,
    Poster,
    Rating,
    VideoUrl,
    series,
  } = req.body;

  try {
    const objectId = new ObjectId(id);
    const result = await Movie.updateOne({ _id: objectId }, req.body);
    if (result.nModified === 0) return res.status(404).send("Movie not found");

    const updatedDoc = await Movie.findById(id);
    res.json(updatedDoc);
  } catch (error) {
    return next(error);
  }
});
//search    checked
router.get("/search", async (req, res) => {
  try {
    const term = req.query.Title;
    const movie = await Movie.find({ Title: { $regex: term, $options: "i" } });
    res.json(movie);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
//get with id
router.get("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ msg: "Movie not found" });
    }
    res.json(movie);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

//genere
const predefinedGenres = ["arabic", "english", "turkish", "hindi", "Spanish"];

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

    const movieData = await Movie.find(genreSearchQuery);

    if (movieData.length === 0) {
      return res.status(404).json({ message: "No data found for the genre" });
    }

    res.json(movieData);
  } catch (err) {
    console.error("Error during search:", err);
    res
      .status(500)
      .json({ message: "An error occurred while searching for movie." });
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

module.exports = router;
module.exports = router;
