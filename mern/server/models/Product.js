const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:            { type: String, required: true },
  category:        { type: String, required: true },
  purchasePrice:   { type: Number, required: true },
  sellingPrice:    { type: Number, required: true },
  currentStock:    { type: Number, default: 0 },
  minReorderQty:   { type: Number, default: 10 },
  supplierName:    { type: String, default: '' },
  supplierContact: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
