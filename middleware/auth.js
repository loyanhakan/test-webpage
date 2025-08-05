const { verifyToken, extractTokenFromHeader } = require('../utils/session');

/**
 * Authentication middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.',
      code: 'NO_TOKEN'
    });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token.',
      code: 'INVALID_TOKEN'
    });
  }
  
  req.user = decoded;
  next();
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth
};