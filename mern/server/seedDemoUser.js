const mongoose = require('mongoose');
const User = require('./models/User');
const { seedDemoData } = require('./utils/seeder');
require('dotenv').config();

async function run() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/demandsense';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Check if demo user exists
  let user = await User.findOne({ email: 'demo@demandsense.ai' });
  if (!user) {
    user = await User.create({
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
    console.log('Created demo user:', user.email);
  }

  // Seed data for this user
  await seedDemoData(user._id);

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
