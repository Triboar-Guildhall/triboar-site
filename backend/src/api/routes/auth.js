import express from 'express';
import { generateToken } from '../../utils/jwt.js';
import * as discordAuthService from '../../services/discordAuthService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /api/auth/discord - Redirect to Discord OAuth
router.get('/discord', (req, res) => {
  const authUrl = discordAuthService.getOAuthURL();
  res.redirect(authUrl);
});

// GET /api/auth/discord/callback - Handle Discord OAuth callback
router.get('/discord/callback', asyncHandler(async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    logger.error({ error, error_description }, 'Discord OAuth error');
    return res.status(401).json({
      error: {
        code: 'DISCORD_AUTH_FAILED',
        message: error_description || 'Discord authentication failed',
      },
    });
  }

  if (!code) {
    return res.status(400).json({
      error: {
        code: 'MISSING_CODE',
        message: 'Authorization code missing',
      },
    });
  }

  try {
    // Handle OAuth callback
    const { user, accessToken } = await discordAuthService.handleOAuthCallback(code);

    // Generate JWT for our app
    const jwtToken = generateToken({
      id: user.id,
      discord_id: user.discord_id,
      email: user.email,
      tier: user.tier,
    });

    // Return token and user info
    // In a real app, you'd likely redirect with token in query or set secure cookie
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        discord_id: user.discord_id,
        discord_username: user.discord_username,
        tier: user.tier,
      },
      token: jwtToken,
    });
  } catch (err) {
    logger.error({ err }, 'OAuth callback failed');
    res.status(401).json({
      error: {
        code: 'AUTH_FAILED',
        message: 'Authentication failed',
      },
    });
  }
}));

// POST /api/auth/logout (optional, for clearing client-side state)
router.post('/logout', (req, res) => {
  // Token-based auth doesn't require server-side logout
  // Client just discards the token
  res.json({ success: true, message: 'Logged out' });
});

export default router;
