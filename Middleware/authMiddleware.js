// authMiddleware.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/adminMoudel");

const secretKey = process.env.JWT_SECRET_KEY;

const authMiddleware = (req, res, next) => {
    // Get the JWT from the Authorization header
    const token =
        req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    // Verify the token
    jwt.verify(token, secretKey, async(err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }

        try {
            // Find the admin by the decoded user ID
            const admin = await Admin.findById(decoded.id);

            if (!admin) {
                return res.status(404).json({ message: "Admin not found" });
            }

            // Check if the admin's role is 'admin'
            if (admin.role !== "admin") {
                return res
                    .status(403)
                    .json({ message: "Access forbidden. Admin role required." });
            }

            // Save the admin's information to req.admin for further usage in the route handler
            req.admin = admin;
            next();
        } catch (error) {
            console.error("Error during authentication:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
};

module.exports = authMiddleware;