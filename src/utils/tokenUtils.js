const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });

const generateTokenPair = (user) => ({
  accessToken: generateAccessToken(user._id, user.role),
  refreshToken: generateRefreshToken(user._id),
});

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const sendTokenResponse = (res, user, statusCode = 200, message = 'Success') => {
  const { accessToken, refreshToken } = generateTokenPair(user);

  // FIX: sameSite 'lax' (not 'strict') so cookie is sent from frontend on :3000
  // to backend on :5000 during navigation. 'strict' blocks all cross-site cookie
  // sends including localhost cross-port. 'none' requires HTTPS. 'lax' is correct
  // for dev (cross-port same host) and works in production behind same domain.
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    user: user.toJSON ? user.toJSON() : user,
  });
};

module.exports = { generateAccessToken, generateRefreshToken, generateTokenPair, generateSecureToken, sendTokenResponse };
