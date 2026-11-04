const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find({ userId: req.user._id }).sort({ date: -1 }).limit(100);
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { productId, quantity, unitPrice, customerId, paymentMethod, date } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const price = unitPrice || product.sellingPrice;
    const sale = await Sale.create({
      userId: req.user._id,
      productId,
      productName: product.name,
      customerId: customerId || null,
      quantity,
      unitPrice: price,
      totalSales: quantity * price,
      paymentMethod: paymentMethod || 'Cash',
      date: date ? new Date(date) : new Date(),
    });

    // Deduct stock
    product.currentStock = Math.max(0, product.currentStock - quantity);
    await product.save();

    // Auto-notify if low stock
    if (product.currentStock <= product.minReorderQty) {
      await Notification.create({
        userId: req.user._id,
        message: `⚠️ Low stock alert: ${product.name} has only ${product.currentStock} units left.`,
        type: 'low_stock',
      });
    }

    res.status(201).json(sale);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
