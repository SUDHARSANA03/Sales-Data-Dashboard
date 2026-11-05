const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const User = require('./models/User');
const { seedDemoData } = require('./utils/seeder');
require('dotenv').config({ path: path.join(__dirname, '.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'demandsense_secret_key_2024';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/sales',        require('./routes/sales'));
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/notifications',require('./routes/notifications'));

// Serve React Frontend (dist)
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/demandsense';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Auto-seed demo account & initial dataset if database is empty
    try {
      const demoUser = await User.findOne({ email: 'demo@demandsense.ai' });
      if (!demoUser) {
        console.log('🌱 First startup: Creating demo account and seeding data...');
        const user = await User.create({
          fullName: 'Demo Executive',
          email: 'demo@demandsense.ai',
          password: 'password123',
          business: {
            name: 'Apex Supermart & Organics',
            category: 'Supermarket / Retail',
            address: '42 MG Road, Sector 4',
            phone: '+91 98765 43210'
          }
        });
        await seedDemoData(user._id);
        console.log('✅ Demo account seeded successfully (demo@demandsense.ai / password123)');
      }
    } catch (seedErr) {
      console.warn('Auto-seed check notice:', seedErr.message);
    }

    app.listen(PORT, () => console.log(`🚀 DemandSense MERN running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
