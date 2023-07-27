const express = require("express");
const Admin = require("../models/adminMoudel");
const router = express.Router();
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const upload = multer();
const verifyToken = require("../Middleware/checktoken")
router.use(express.json());

const generateAccessToken = (user) => {
    // Set the expiration time for the token (e.g., 1 hour)
    const expiresIn = "1h";

    // Retrieve the JWT_SECRET_KEY from the environment variable
    const secretKey = process.env.JWT_SECRET_KEY;

    // Create the payload for the token
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role, // You can include the user's role in the payload if needed
    };

    // Generate the token using the payload, secret key, and expiration time
    const token = jwt.sign(payload, secretKey, { expiresIn });

    return token;
};

// Endpoint for user login and generating JWT
router.post("/login", async(req, res) => {
    const { email, password } = req.body;
    try {
        // Find the admin by email
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Compare the entered password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Password is valid, proceed with login

        // Generate an access token
        const accessToken = generateAccessToken(admin);

        // Customize the response structure with the required data
        const response = {
            message: "Login successful",
            accessToken,
            // Include any other user data you want to send back in the response
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.username,
                image: admin.image,
            },
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/checkToken", verifyToken, (req, res) => {
    // If the middleware passed, the token is valid
    res.json({ message: "Token is valid.", user: req.user });
});

module.exports = router;