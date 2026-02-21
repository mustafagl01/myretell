import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * JWT authentication middleware for protected routes
 * Verifies the JWT token from the Authorization header and attaches user to req.user
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const authenticateToken = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is required'
    });
  }

  // Verify JWT token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user information to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired'
      });
    }

    // Log unexpected errors but don't expose details to client
    console.error('JWT verification error:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate token'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to req.user if valid token is present, but doesn't require it
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    // For optional auth, invalid token doesn't block the request
    req.user = null;
  }

  next();
};
