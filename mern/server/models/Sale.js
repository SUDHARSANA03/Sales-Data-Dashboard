const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:   { type: String },
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  quantity:      { type: Number, required: true },
  unitPrice:     { type: Number, required: true },
  totalSales:    { type: Number, required: true },
  paymentMethod: { type: String, default: 'Cash' },
  date:          { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
