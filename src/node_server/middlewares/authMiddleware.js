const jwt = require('jsonwebtoken'); 
const SECRET_KEY = 'my_secret_key'; 

// Middleware function to authenticate incoming requests using JWT
function authenticateToken(req, res, next) {
  // Get the Authorization header (expected format: "Bearer <token>")
  const authHeader = req.headers['authorization'];
  
  // Extract the token from the header
  const token = authHeader && authHeader.split(' ')[1];
  
  // If no token is provided, reject the request with 401 Unauthorized
  if (!token) {
    return res.status(401).send("Access token missing");
  }

  // Verify the token using the same secret key used to sign it
  jwt.verify(token, SECRET_KEY, (err, userData) => {
    // If token is invalid or expired, reject with 403 Forbidden
    if (err) {
      return res.status(403).send("Invalid or expired token");
    }

    // Attach the decoded user data to the request object for use in controllers
    req.user = userData;

    // Continue to the next middleware or route handler
    next();
  });
}

// Export the middleware so it can be used in routes
module.exports = authenticateToken;
