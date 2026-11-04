const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'demandsense_secret_key_2024', { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, businessName, businessCategory } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      fullName, email, password,
      business: { name: businessName || 'My Business', category: businessCategory || 'Retail' }
    });

    // Auto-seed demo data for new user
    await require('../utils/seeder').seedDemoData(user._id);

    res.status(201).json({ token: signToken(user._id), user: { id: user._id, fullName: user.fullName, email: user.email, business: user.business } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ token: signToken(user._id), user: { id: user._id, fullName: user.fullName, email: user.email, business: user.business } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;
