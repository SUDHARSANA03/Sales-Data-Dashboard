const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// ─── Helper: group sales by date ─────────────────────────────────────────────
function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = (acc[k] || []);
    acc[k].push(item);
    return acc;
  }, {});
}

// ─── GET /api/analytics/summary ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const uid = req.user._id;
    const sales    = await Sale.find({ userId: uid });
    const products = await Product.find({ userId: uid });

    const totalRevenue  = sales.reduce((s, x) => s + x.totalSales, 0);
    const totalSales    = sales.length;
    const totalProfit   = sales.reduce((s, x) => {
      const p = products.find(p => p._id.toString() === x.productId.toString());
      return s + (p ? x.quantity * (p.sellingPrice - p.purchasePrice) : 0);
    }, 0);
    const inventoryValue = products.reduce((s, p) => s + p.currentStock * p.purchasePrice, 0);

    // Business health score (0-100)
    const lowStockCount  = products.filter(p => p.currentStock <= p.minReorderQty).length;
    const healthScore    = Math.max(10, Math.min(100,
      100 - (lowStockCount / Math.max(1, products.length)) * 40 +
      (totalRevenue > 0 ? Math.min(20, totalRevenue / 10000) : 0)
    ));

    res.json({ totalRevenue, totalSales, totalProfit, inventoryValue, businessHealthScore: Math.round(healthScore) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET /api/analytics/sales ────────────────────────────────────────────────
router.get('/sales', async (req, res) => {
  try {
    const uid    = req.user._id;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
    const sales  = await Sale.find({ userId: uid, date: { $gte: cutoff } }).sort({ date: 1 });

    // Daily
    const dailyMap = {};
    sales.forEach(s => {
      const d = s.date.toISOString().slice(0, 10);
      dailyMap[d] = (dailyMap[d] || 0) + s.totalSales;
    });
    const dailySales = Object.entries(dailyMap).map(([date, sales]) => ({ date, sales: Math.round(sales * 100) / 100 }));

    // Weekly
    const weekMap = {};
    sales.forEach(s => {
      const d  = new Date(s.date);
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
      const wk  = mon.toISOString().slice(0, 10);
      weekMap[wk] = (weekMap[wk] || 0) + s.totalSales;
    });
    const weeklySales = Object.entries(weekMap).map(([week, sales]) => ({ week, sales: Math.round(sales * 100) / 100 }));

    // Monthly
    const monthMap = {};
    sales.forEach(s => {
      const m = s.date.toISOString().slice(0, 7);
      monthMap[m] = (monthMap[m] || 0) + s.totalSales;
    });
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlySales = Object.entries(monthMap).sort().map(([m, s]) => ({
      month: months[parseInt(m.slice(5,7))-1] + ' ' + m.slice(0,4),
      sales: Math.round(s * 100) / 100
    }));

    // Growth
    const now = new Date();
    const t30 = new Date(); t30.setDate(now.getDate() - 30);
    const thisMonth = sales.filter(s => s.date >= t30).reduce((a, s) => a + s.totalSales, 0);
    const lastMonth = sales.filter(s => s.date < t30).reduce((a, s) => a + s.totalSales, 0);
    const growthPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(2) : 0;

    res.json({ totalRevenue: sales.reduce((a,s)=>a+s.totalSales,0), dailySales, weeklySales, monthlySales, revenueGrowthPct: parseFloat(growthPct) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET /api/analytics/products ─────────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const uid      = req.user._id;
    const sales    = await Sale.find({ userId: uid });
    const products = await Product.find({ userId: uid });

    // Top selling
    const qtyMap = {};
    const revMap = {};
    sales.forEach(s => {
      const name = s.productName || s.productId.toString();
      qtyMap[name] = (qtyMap[name] || 0) + s.quantity;
      revMap[name] = (revMap[name] || 0) + s.totalSales;
    });
    const topSelling = Object.entries(qtyMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, qty]) => ({ productName: name, quantitySold: qty, revenue: Math.round(revMap[name] * 100) / 100 }));

    // Product intelligence (velocity classification)
    const classifications = products.map(p => {
      const sold = sales.filter(s => s.productId.toString() === p._id.toString()).reduce((a,s)=>a+s.quantity,0);
      const dailyVelocity = sold / 30;
      const daysLeft = dailyVelocity > 0 ? Math.floor(p.currentStock / dailyVelocity) : -1;

      let classification;
      if (dailyVelocity >= 5)       classification = 'Fast Moving';
      else if (dailyVelocity >= 2)  classification = 'Medium Moving';
      else if (dailyVelocity >= 0.5)classification = 'Slow Moving';
      else                          classification = 'Dead Stock';

      let recommendation;
      if (p.currentStock <= p.minReorderQty) recommendation = 'Restock';
      else if (p.currentStock > p.minReorderQty * 5) recommendation = 'Buy Less';
      else recommendation = 'Do Not Restock';

      return {
        productId: p._id, productName: p.name, category: p.category,
        stockLevel: p.currentStock, minReorderQty: p.minReorderQty,
        dailySalesVelocity: Math.round(dailyVelocity * 100) / 100,
        expectedStockoutDays: daysLeft, classification, recommendation,
        suggestedReorderQty: recommendation === 'Restock' ? Math.max(p.minReorderQty, Math.ceil(dailyVelocity * 14)) : 0,
      };
    });

    res.json({ topSelling, classifications });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET /api/analytics/forecast ─────────────────────────────────────────────
router.get('/forecast', async (req, res) => {
  try {
    const uid      = req.user._id;
    const sales    = await Sale.find({ userId: uid }).sort({ date: 1 });
    const products = await Product.find({ userId: uid });

    if (!sales.length) return res.json({ overallSalesForecast: [], productForecasts: [] });

    // Simple linear regression forecast per product
    const qtyMap = {};
    sales.forEach(s => {
      const pid = s.productId.toString();
      if (!qtyMap[pid]) qtyMap[pid] = [];
      qtyMap[pid].push({ date: s.date, qty: s.quantity });
    });

    // Top 6 products by volume
    const topPids = Object.entries(qtyMap)
      .map(([pid, arr]) => ({ pid, total: arr.reduce((a,x)=>a+x.qty,0) }))
      .sort((a,b) => b.total - a.total).slice(0, 6).map(x => x.pid);

    const productForecasts = [];
    const overallMap = {};

    for (const pid of topPids) {
      const prod = products.find(p => p._id.toString() === pid);
      if (!prod) continue;

      // Aggregate daily qty for this product
      const dailyMap = {};
      qtyMap[pid].forEach(x => {
        const d = x.date.toISOString().slice(0, 10);
        dailyMap[d] = (dailyMap[d] || 0) + x.qty;
      });
      const pts = Object.entries(dailyMap).sort();

      // Linear regression on (index, qty)
      const n = pts.length;
      let sumX=0, sumY=0, sumXY=0, sumX2=0;
      pts.forEach(([,y], i) => { sumX+=i; sumY+=y; sumXY+=i*y; sumX2+=i*i; });
      const denom = n*sumX2 - sumX*sumX;
      const slope = denom !== 0 ? (n*sumXY - sumX*sumY) / denom : 0;
      const intercept = (sumY - slope*sumX) / n;

      // Generate 30-day forecast
      const forecastPts = [];
      const baseDate = new Date();
      for (let i = 0; i < 30; i++) {
        const fd = new Date(baseDate); fd.setDate(fd.getDate() + i);
        const predicted = Math.max(0, intercept + slope * (n + i));
        const dateStr = fd.toISOString().slice(0, 10);
        forecastPts.push({ date: dateStr, forecastedDemand: Math.round(predicted * 10) / 10 });
        overallMap[dateStr] = (overallMap[dateStr] || 0) + predicted;
      }

      const nextWeek  = forecastPts.slice(0, 7).reduce((a,x)=>a+x.forecastedDemand, 0);
      const nextMonth = forecastPts.reduce((a,x)=>a+x.forecastedDemand, 0);
      const dailyVel  = qtyMap[pid].reduce((a,x)=>a+x.qty, 0) / 30;
      const daysLeft  = dailyVel > 0 ? Math.floor(prod.currentStock / dailyVel) : -1;

      productForecasts.push({
        productId: pid, productName: prod.name,
        nextWeekDemand: Math.round(nextWeek * 10) / 10,
        nextMonthDemand: Math.round(nextMonth * 10) / 10,
        suggestedReorder: Math.ceil(nextWeek),
        expectedStockoutDays: daysLeft,
        demandTrend: slope > 0.1 ? 'Increasing' : slope < -0.1 ? 'Declining' : 'Stable',
        forecastPoints: forecastPts,
      });
    }

    const overallSalesForecast = Object.entries(overallMap).sort()
      .map(([date, v]) => ({ date, forecastedSales: Math.round(v * 100) / 100 }));

    res.json({ overallSalesForecast, productForecasts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET /api/analytics/customers ────────────────────────────────────────────
router.get('/customers', async (req, res) => {
  try {
    const uid       = req.user._id;
    const sales     = await Sale.find({ userId: uid, customerId: { $ne: null } }).populate('customerId');
    const customers = await Customer.find({ userId: uid });

    // Repeat customers
    const custMap = {};
    sales.forEach(s => {
      if (!s.customerId) return;
      const cid = s.customerId._id.toString();
      if (!custMap[cid]) custMap[cid] = { name: s.customerId.name, total: 0, count: 0 };
      custMap[cid].total += s.totalSales;
      custMap[cid].count += 1;
    });
    const repeatCustomers = Object.entries(custMap)
      .sort((a,b) => b[1].count - a[1].count).slice(0, 10)
      .map(([id, v]) => ({ customerId: id, customerName: v.name, totalSpent: Math.round(v.total*100)/100, purchaseCount: v.count }));

    // Day of week patterns
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayMap = {}; days.forEach(d => dayMap[d] = 0);
    const allSales = await Sale.find({ userId: uid });
    allSales.forEach(s => { dayMap[days[new Date(s.date).getDay()]] += s.totalSales; });
    const purchasePatterns = days.map(day => ({ day, revenue: Math.round(dayMap[day]*100)/100 }));

    // Segments
    const segments = { Loyal: 0, Regular: 0, Occasional: 0, New: 0 };
    customers.forEach(c => { segments[c.segment] = (segments[c.segment] || 0) + 1; });

    res.json({ repeatCustomers, purchasePatterns, segments });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
