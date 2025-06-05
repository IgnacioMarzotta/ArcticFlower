const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already registered' });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: 'User successfully created' });
  } catch (error) {
    console.error("[user.controller] Register error:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials, please try again.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials, please try again.' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username email createdAt permissions');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      username: user.username,
      email: user.email,
      created_at: user.createdAt,
      permissions: user.permissions
    });
  } catch (error) {
    console.error("GetProfile error:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.refresh = async (req, res) => {
  const oldRefreshToken = req.cookies['refresh_token'];
  if (!oldRefreshToken) {
    return res.status(401).json({ message: 'No refresh token provided', code: 'NO_REFRESH_TOKEN' });
  }

  try {
    const payload = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      res.clearCookie('refresh_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      return res.status(403).json({ message: 'User not found for refresh token', code: 'USER_NOT_FOUND' });
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: newAccessToken });

  } catch (e) {
    console.error("Refresh token error:", e.message);
    res.clearCookie('refresh_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return res.status(403).json({ message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
  }
};


exports.logout = (req, res) => {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.status(200).json({ message: 'Successfully logged out' });
};