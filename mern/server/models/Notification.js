const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type:    { type: String, required: true }, // low_stock, overstock, demand_increase, forecast_update
  isRead:  { type: Boolean, default: false },
  date:    { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
