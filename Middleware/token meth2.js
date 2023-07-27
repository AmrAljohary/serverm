const secretKey = process.env.JWT_SECRET_KEY;
const jwt = require("jsonwebtoken");

// Middleware function to verify JWT token
const verifyToken = (req, res, next) => {
    let token = req.header("Authorization");
    if (token) {
        token = token.replace("Bearer ", "");
    }

    // Optional: Define specific route paths that are excluded from token verification
    const excludedRoutes = ["/public", "/unprotected"];

    if (!token) {
        return res
            .status(401)
            .json({ message: "Access denied. No token provided." });
    }

    try {
        // Verify the token with your secret key (it should be the same key you used to sign the token)
        const decoded = jwt.verify(token, secretKey);

        // Optional: Check if the token is close to expiration, and if so, generate a new one and send it in the response header
        const expirationTime = decoded.exp;
        const currentTime = Date.now() / 1000; // Convert to seconds
        const timeUntilExpiration = expirationTime - currentTime;
        const refreshTokenThreshold = 300; // 5 minutes (in seconds)

        if (timeUntilExpiration < refreshTokenThreshold) {
            const newToken = jwt.sign({
                    /* Payload */
                },
                secretKey, { expiresIn: "1h" }
            ); // Generate a new token with an updated expiration time
            res.setHeader("Authorization", `Bearer ${newToken}`);
        }

        // Add the decoded token payload to the request object for further use in other routes
        req.user = decoded;

        // Call the next middleware or route handler
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res
                .status(401)
                .json({ message: "Token has expired. Please log in again." });
        }

        return res.status(401).json({ message: "Invalid token." });
    }
};

module.exports = verifyToken;