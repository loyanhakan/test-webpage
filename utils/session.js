const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Create a JWT token for user
 */
function createToken(user) {
  const payload = {
    userId: user.id,
    telegramId: user.telegram_id,
    username: user.username,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Check if token needs refresh (less than 24 hours remaining)
 */
function needsRefresh(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    
    return timeUntilExpiry < REFRESH_THRESHOLD;
  } catch (error) {
    return true;
  }
}

/**
 * Extract token from Authorization header
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware to verify authentication
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
}

module.exports = {
  createToken,
  verifyToken,
  needsRefresh,
  extractTokenFromHeader,
  requireAuth
};