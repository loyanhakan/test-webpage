const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Use authentication middleware for all protected routes
router.use(authenticateToken);

/**
 * Protected user profile endpoint
 */
router.get('/profile', (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * Protected user settings endpoint
 */
router.get('/settings', (req, res) => {
  res.json({
    message: 'User settings (protected)',
    userId: req.user.userId,
    username: req.user.username,
    settings: {
      theme: 'dark',
      notifications: true,
      language: 'tr'
    }
  });
});

/**
 * Protected dashboard endpoint
 */
router.get('/dashboard', (req, res) => {
  res.json({
    message: 'Welcome to your dashboard',
    user: {
      id: req.user.userId,
      username: req.user.username,
      telegramId: req.user.telegramId
    },
    stats: {
      loginCount: Math.floor(Math.random() * 100),
      lastLogin: new Date().toISOString(),
      accountAge: '30 days'
    }
  });
});

module.exports = router;