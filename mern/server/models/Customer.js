const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  phone:   { type: String, default: '' },
  email:   { type: String, default: '' },
  segment: { type: String, default: 'Occasional', enum: ['Loyal', 'Regular', 'Occasional', 'New'] },
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
