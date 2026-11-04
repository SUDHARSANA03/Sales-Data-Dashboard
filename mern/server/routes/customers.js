const express = require('express');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, userId: req.user._id });
    res.status(201).json(customer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, req.body, { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
