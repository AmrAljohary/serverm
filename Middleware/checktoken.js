const secretKey = process.env.JWT_SECRET_KEY;
const jwt = require("jsonwebtoken");
// Middleware function to verify JWT token
const verifyToken = (req, res, next) => {
    // Get the token from the request header or query parameter or wherever you are sending it from
    let token = req.header('Authorization');
    if (token) {
        token = token.replace('Bearer ', '');
    }
    if (!token) {
        return res
            .status(401)
            .json({ message: "Access denied. No token provided." });
    }

    try {
        // Verify the token with your secret key (it should be the same key you used to sign the token)
        const decoded = jwt.verify(token, secretKey);

        // Add the decoded token payload to the request object for further use in other routes
        req.user = decoded;

        // Call the next middleware or route handler
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token." });
    }
};

module.exports = verifyToken;