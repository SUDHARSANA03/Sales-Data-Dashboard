const mongoose = require('mongoose');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');

const PRODUCTS = [
  { name: 'Fresh Milk 1L', category: 'Dairy', purchasePrice: 42, sellingPrice: 55, currentStock: 120, minReorderQty: 30 },
  { name: 'Whole Wheat Bread 500g', category: 'Bakery', purchasePrice: 28, sellingPrice: 40, currentStock: 80, minReorderQty: 20 },
  { name: 'Organic Eggs (Dozen)', category: 'Dairy', purchasePrice: 70, sellingPrice: 95, currentStock: 60, minReorderQty: 15 },
  { name: 'Olive Oil Extra Virgin 1L', category: 'Oils & Condiments', purchasePrice: 280, sellingPrice: 380, currentStock: 35, minReorderQty: 10 },
  { name: 'Spaghetti Pasta 500g', category: 'Grains & Pasta', purchasePrice: 48, sellingPrice: 65, currentStock: 90, minReorderQty: 20 },
  { name: 'Fresh Gala Apples (1kg)', category: 'Fruits', purchasePrice: 85, sellingPrice: 120, currentStock: 50, minReorderQty: 15 },
  { name: 'Orange Juice 1L', category: 'Beverages', purchasePrice: 60, sellingPrice: 85, currentStock: 45, minReorderQty: 12 },
  { name: 'Basmati Rice 5kg', category: 'Grains & Pasta', purchasePrice: 320, sellingPrice: 420, currentStock: 25, minReorderQty: 8 },
  { name: 'Greek Yogurt 500g', category: 'Dairy', purchasePrice: 90, sellingPrice: 125, currentStock: 40, minReorderQty: 12 },
  { name: 'Dark Chocolate 200g', category: 'Snacks', purchasePrice: 110, sellingPrice: 155, currentStock: 30, minReorderQty: 10 },
  { name: 'Green Tea (25 bags)', category: 'Beverages', purchasePrice: 75, sellingPrice: 110, currentStock: 55, minReorderQty: 15 },
  { name: 'Almond Butter 300g', category: 'Snacks', purchasePrice: 240, sellingPrice: 320, currentStock: 20, minReorderQty: 8 },
];

const CUSTOMERS = [
  { name: 'Priya Sharma', phone: '9876543210', email: 'priya@email.com', segment: 'Loyal' },
  { name: 'Rahul Verma', phone: '9765432109', email: 'rahul@email.com', segment: 'Regular' },
  { name: 'Anjali Singh', phone: '9654321098', email: 'anjali@email.com', segment: 'Occasional' },
  { name: 'Mohammed Ali', phone: '9543210987', email: 'mali@email.com', segment: 'Loyal' },
  { name: 'Deepika Nair', phone: '9432109876', email: 'deepika@email.com', segment: 'New' },
];

async function seedDemoData(userId) {
  // Create products
  const products = await Product.insertMany(PRODUCTS.map(p => ({ ...p, userId })));

  // Create customers
  const customers = await Customer.insertMany(CUSTOMERS.map(c => ({ ...c, userId })));

  // Create 60 days of historical sales
  const sales = [];
  const now = new Date();
  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    const saleDate = new Date(now);
    saleDate.setDate(now.getDate() - daysAgo);
    const numSales = Math.floor(Math.random() * 6) + 3;
    for (let i = 0; i < numSales; i++) {
      const prod = products[Math.floor(Math.random() * products.length)];
      const qty  = Math.floor(Math.random() * 5) + 1;
      const cust = Math.random() > 0.4 ? customers[Math.floor(Math.random() * customers.length)] : null;
      sales.push({
        userId, productId: prod._id, productName: prod.name,
        customerId: cust ? cust._id : null,
        quantity: qty, unitPrice: prod.sellingPrice,
        totalSales: qty * prod.sellingPrice,
        paymentMethod: ['Cash','Card','UPI'][Math.floor(Math.random()*3)],
        date: saleDate,
      });
    }
  }
  await Sale.insertMany(sales);

  // Notifications
  await Notification.insertMany([
    { userId, message: '⚠️ Almond Butter 300g is running low (20 units)', type: 'low_stock' },
    { userId, message: '📈 Demand for Fresh Milk 1L is increasing this week', type: 'demand_increase' },
    { userId, message: '🤖 ML forecast updated for top 6 products', type: 'forecast_update' },
  ]);

  console.log(`✅ Demo data seeded for user ${userId}`);
}

module.exports = { seedDemoData };
