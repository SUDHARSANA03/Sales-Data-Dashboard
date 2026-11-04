import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Cpu,
  Users,
  PlusCircle,
  Bell,
  LogOut,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Activity,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = '/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('overview');

  // Dashboard Data
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  // Modals
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Sale Form
  const [saleForm, setSaleForm] = useState({
    productId: '',
    quantity: 1,
    unitPrice: '',
    paymentMethod: 'Cash',
  });

  // Auth Form
  const [authForm, setAuthForm] = useState({
    fullName: '',
    email: 'demo@demandsense.ai',
    password: 'password123',
    businessName: 'Apex Supermart',
    businessCategory: 'Retail',
  });
  const [authError, setAuthError] = useState('');

  // Selected product for forecast detail
  const [selectedForecastPid, setSelectedForecastPid] = useState('');

  // Headers helper
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  });

  // Check auth & fetch user info
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: getHeaders() })
        .then((res) => {
          if (!res.ok) throw new Error('Unauthorized');
          return res.json();
        })
        .then((data) => {
          setUser(data);
          fetchAllData();
        })
        .catch(() => {
          setToken('');
          localStorage.removeItem('token');
          setShowLoginModal(true);
        });
    } else {
      setShowLoginModal(true);
    }
  }, [token]);

  // Fetch all dashboard data
  const fetchAllData = async () => {
    try {
      const [sumRes, sRes, pRes, fRes, cRes, nRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/summary`, { headers: getHeaders() }),
        fetch(`${API_BASE}/analytics/sales`, { headers: getHeaders() }),
        fetch(`${API_BASE}/analytics/products`, { headers: getHeaders() }),
        fetch(`${API_BASE}/analytics/forecast`, { headers: getHeaders() }),
        fetch(`${API_BASE}/analytics/customers`, { headers: getHeaders() }),
        fetch(`${API_BASE}/notifications`, { headers: getHeaders() }),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (sRes.ok) setSalesData(await sRes.json());
      if (pRes.ok) {
        const p = await pRes.json();
        setProductsData(p);
      }
      if (fRes.ok) {
        const f = await fRes.json();
        setForecastData(f);
        if (f.productForecasts && f.productForecasts.length > 0) {
          setSelectedForecastPid(f.productForecasts[0].productId);
        }
      }
      if (cRes.ok) setCustomersData(await cRes.json());
      if (nRes.ok) setNotifications(await nRes.json());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  // Auth Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegister ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowLoginModal(false);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setShowLoginModal(true);
  };

  // Record Sale Handler
  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!saleForm.productId) return alert('Please select a product');

    try {
      const res = await fetch(`${API_BASE}/sales`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          productId: saleForm.productId,
          quantity: parseInt(saleForm.quantity),
          unitPrice: saleForm.unitPrice ? parseFloat(saleForm.unitPrice) : undefined,
          paymentMethod: saleForm.paymentMethod,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Sale failed');
      }

      setShowSaleModal(false);
      setSaleForm({ productId: '', quantity: 1, unitPrice: '', paymentMethod: 'Cash' });
      fetchAllData();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- CHART CONFIGURATIONS ---

  // 1. Executive Revenue vs Profit Chart
  const execChartData = {
    labels: salesData?.dailySales?.slice(-14).map((s) => s.date.slice(5)) || [],
    datasets: [
      {
        label: 'Revenue',
        data: salesData?.dailySales?.slice(-14).map((s) => s.sales) || [],
        borderColor: '#3b82f6',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#3b82f6',
      },
      {
        label: 'Estimated Profit',
        data: salesData?.dailySales?.slice(-14).map((s) => Math.round(s.sales * 0.42)) || [],
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [5, 4],
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
      },
    ],
  };

  // 2. Category Breakdown Doughnut Chart
  const categoryMap = {};
  productsData?.classifications?.forEach((p) => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + p.stockLevel;
  });

  const categoryDoughnutData = {
    labels: Object.keys(categoryMap),
    datasets: [
      {
        data: Object.values(categoryMap),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
        borderWidth: 3,
        borderColor: '#0f172a',
        hoverOffset: 8,
      },
    ],
  };

  // 3. Weekly Sales Bar Chart
  const weeklyChartData = {
    labels: salesData?.weeklySales?.map((w) => `Wk ${w.week.slice(5)}`) || [],
    datasets: [
      {
        label: 'Sales Revenue (₹)',
        data: salesData?.weeklySales?.map((w) => w.sales) || [],
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
          return gradient;
        },
        borderRadius: 8,
      },
    ],
  };

  // 4. Monthly Sales Bar Chart
  const monthlyChartData = {
    labels: salesData?.monthlySales?.map((m) => m.month) || [],
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: salesData?.monthlySales?.map((m) => m.sales) || [],
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, '#f59e0b');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.2)');
          return gradient;
        },
        borderRadius: 8,
      },
    ],
  };

  // 5. Active Forecast Chart for Selected Product
  const activeProductForecast = forecastData?.productForecasts?.find(
    (f) => f.productId === selectedForecastPid
  );

  const forecastLineData = {
    labels: activeProductForecast?.forecastPoints?.map((p) => p.date.slice(5)) || [],
    datasets: [
      {
        label: `${activeProductForecast?.productName || 'Product'} Projected Demand`,
        data: activeProductForecast?.forecastPoints?.map((p) => p.forecastedDemand) || [],
        borderColor: '#8b5cf6',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#8b5cf6',
      },
    ],
  };

  // 6. Day of Week Pattern Chart
  const dayPatternData = {
    labels: customersData?.purchasePatterns?.map((p) => p.day.slice(0, 3)) || [],
    datasets: [
      {
        label: 'Revenue by Day (₹)',
        data: customersData?.purchasePatterns?.map((p) => p.revenue) || [],
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
    ],
  };

  const chartDefaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#94a3b8',
        bodyColor: '#f8fafc',
        bodyFont: { weight: 'bold' },
        callbacks: {
          label: (ctx) => ` ₹${ctx.raw?.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', callback: (v) => '₹' + v.toLocaleString() },
      },
    },
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Cpu size={22} color="#fff" />
          </div>
          <div>
            <div className="brand-title">
              DemandSense <span className="brand-tag">MERN</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentTab === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentTab('overview')}
          >
            <LayoutDashboard size={18} />
            <span>Executive Overview</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'sales' ? 'active' : ''}`}
            onClick={() => setCurrentTab('sales')}
          >
            <TrendingUp size={18} />
            <span>Sales Analytics</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'products' ? 'active' : ''}`}
            onClick={() => setCurrentTab('products')}
          >
            <Package size={18} />
            <span>Products & Inventory</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setCurrentTab('forecast')}
          >
            <Sparkles size={18} />
            <span>AI Demand Forecast</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'customers' ? 'active' : ''}`}
            onClick={() => setCurrentTab('customers')}
          >
            <Users size={18} />
            <span>Customer Intelligence</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-profile-badge">
              <div className="user-avatar">{user.fullName?.charAt(0) || 'U'}</div>
              <div className="user-info">
                <div className="user-name">{user.fullName}</div>
                <div className="user-role">{user.business?.category || 'Retail Store'}</div>
              </div>
              <button
                className="icon-btn"
                style={{ width: 30, height: 30 }}
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowLoginModal(true)}>
              Login / Demo Account
            </button>
          )}
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="main-wrapper">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <h2>
              {currentTab === 'overview' && 'Executive Business Dashboard'}
              {currentTab === 'sales' && 'Sales Performance & Trends'}
              {currentTab === 'products' && 'Product Intelligence & Stock'}
              {currentTab === 'forecast' && 'AI Demand Forecasting (Linear Regression)'}
              {currentTab === 'customers' && 'Customer Analytics & Affinity'}
            </h2>
            <p>{user?.business?.name || 'Apex Supermart'} • Live Database Feed</p>
          </div>

          <div className="topbar-right">
            <button className="btn btn-primary" onClick={() => setShowSaleModal(true)}>
              <PlusCircle size={16} />
              Record Sale
            </button>

            <button className="icon-btn" onClick={() => setShowNotifs(!showNotifs)}>
              <Bell size={18} />
              {notifications.filter((n) => !n.isRead).length > 0 && <span className="badge-dot" />}
            </button>

            {/* Notifications Dropdown */}
            {showNotifs && (
              <div className="notif-dropdown">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700 }}>System Notifications</h4>
                  <span style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer' }}>Mark all read</span>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
                    No alerts at this moment
                  </p>
                ) : (
                  notifications.slice(0, 5).map((n, i) => (
                    <div key={i} className={`notif-item ${n.type}`}>
                      <p style={{ fontWeight: 500 }}>{n.message}</p>
                      <span style={{ fontSize: 10, color: '#64748b' }}>
                        {new Date(n.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="content-body">
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {currentTab === 'overview' && (
            <>
              {/* KPI Strip */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                    <DollarSign color="#3b82f6" size={24} />
                  </div>
                  <div className="kpi-info">
                    <div className="kpi-label">Total Revenue</div>
                    <div className="kpi-value">₹{summary?.totalRevenue?.toLocaleString() || '0'}</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                    <ShoppingBag color="#10b981" size={24} />
                  </div>
                  <div className="kpi-info">
                    <div className="kpi-label">Total Transactions</div>
                    <div className="kpi-value">{summary?.totalSales?.toLocaleString() || '0'}</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                    <TrendingUp color="#f59e0b" size={24} />
                  </div>
                  <div className="kpi-info">
                    <div className="kpi-label">Gross Profit</div>
                    <div className="kpi-value">₹{summary?.totalProfit?.toLocaleString() || '0'}</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                    <Activity color="#8b5cf6" size={24} />
                  </div>
                  <div className="kpi-info">
                    <div className="kpi-label">Business Health</div>
                    <div className="kpi-value">{summary?.businessHealthScore || 85} / 100</div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="charts-row">
                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Revenue & Profit Trends (Last 14 Days)</h3>
                  </div>
                  <div className="chart-container">
                    <Line data={execChartData} options={chartDefaultOptions} />
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Inventory by Category</h3>
                  </div>
                  <div className="chart-container" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Doughnut
                      data={categoryDoughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Fast Moving Products Quick Table */}
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Top Selling Products</h3>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Units Sold</th>
                        <th>Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsData?.topSelling?.slice(0, 5).map((p, idx) => (
                        <tr key={idx}>
                          <td><b>{p.productName}</b></td>
                          <td>{p.quantitySold} units</td>
                          <td>₹{p.revenue?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SALES ANALYTICS */}
          {currentTab === 'sales' && (
            <>
              <div className="charts-grid-2">
                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Weekly Revenue Breakdown</h3>
                  </div>
                  <div className="chart-container">
                    <Bar data={weeklyChartData} options={chartDefaultOptions} />
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Monthly Revenue</h3>
                  </div>
                  <div className="chart-container">
                    <Bar data={monthlyChartData} options={chartDefaultOptions} />
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Daily Sales Velocity</h3>
                </div>
                <div className="chart-container">
                  <Line data={execChartData} options={chartDefaultOptions} />
                </div>
              </div>
            </>
          )}

          {/* TAB 3: PRODUCTS & INVENTORY */}
          {currentTab === 'products' && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Product Intelligence & Stockout Analysis</h3>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Stock Level</th>
                      <th>Min Reorder</th>
                      <th>Sales Velocity</th>
                      <th>Days to Stockout</th>
                      <th>Velocity Tier</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsData?.classifications?.map((p, i) => {
                      const vClass = p.classification.toLowerCase().replace(' ', '-');
                      return (
                        <tr key={i}>
                          <td><b>{p.productName}</b></td>
                          <td>{p.category}</td>
                          <td><b>{p.stockLevel}</b> units</td>
                          <td>{p.minReorderQty}</td>
                          <td>{p.dailySalesVelocity} / day</td>
                          <td>{p.expectedStockoutDays < 0 ? 'Adequate' : `${p.expectedStockoutDays} days`}</td>
                          <td>
                            <span className={`badge badge-${vClass.split('-')[0]}`}>
                              {p.classification}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                p.recommendation === 'Restock' ? 'badge-restock' : 'badge-occasional'
                              }`}
                            >
                              {p.recommendation}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: AI DEMAND FORECAST */}
          {currentTab === 'forecast' && (
            <>
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Linear Regression 30-Day Demand Projection</h3>
                  <select
                    className="form-select"
                    style={{ width: 220 }}
                    value={selectedForecastPid}
                    onChange={(e) => setSelectedForecastPid(e.target.value)}
                  >
                    {forecastData?.productForecasts?.map((f) => (
                      <option key={f.productId} value={f.productId}>
                        {f.productName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="chart-container" style={{ height: 320 }}>
                  <Line data={forecastLineData} options={chartDefaultOptions} />
                </div>
              </div>

              {activeProductForecast && (
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                      <TrendingUp color="#3b82f6" size={24} />
                    </div>
                    <div className="kpi-info">
                      <div className="kpi-label">Next 7-Day Demand</div>
                      <div className="kpi-value">{activeProductForecast.nextWeekDemand} units</div>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                      <Sparkles color="#10b981" size={24} />
                    </div>
                    <div className="kpi-info">
                      <div className="kpi-label">30-Day Projection</div>
                      <div className="kpi-value">{activeProductForecast.nextMonthDemand} units</div>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                      <AlertTriangle color="#ef4444" size={24} />
                    </div>
                    <div className="kpi-info">
                      <div className="kpi-label">Stockout In</div>
                      <div className="kpi-value">
                        {activeProductForecast.expectedStockoutDays < 0
                          ? 'No Risk'
                          : `${activeProductForecast.expectedStockoutDays} days`}
                      </div>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                      <Package color="#8b5cf6" size={24} />
                    </div>
                    <div className="kpi-info">
                      <div className="kpi-label">Suggested Reorder</div>
                      <div className="kpi-value">{activeProductForecast.suggestedReorder} units</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 5: CUSTOMER INTELLIGENCE */}
          {currentTab === 'customers' && (
            <div className="charts-grid-2">
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Top Loyal Repeat Customers</h3>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Purchases</th>
                        <th>Total Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersData?.repeatCustomers?.map((c, i) => (
                        <tr key={i}>
                          <td><b>{c.customerName}</b></td>
                          <td>{c.purchaseCount} orders</td>
                          <td>₹{c.totalSpent?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Revenue by Day of Week</h3>
                </div>
                <div className="chart-container">
                  <Bar data={dayPatternData} options={chartDefaultOptions} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RECORD SALE MODAL */}
      {showSaleModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Record New Sale</h3>
              <button
                className="icon-btn"
                style={{ width: 32, height: 32 }}
                onClick={() => setShowSaleModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="modal-desc">Enter transaction details to update inventory and intelligence.</p>

            <form onSubmit={handleRecordSale}>
              <div className="form-group">
                <label>Select Product</label>
                <select
                  className="form-select"
                  value={saleForm.productId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = productsData?.classifications?.find((p) => p.productId === pid);
                    setSaleForm({
                      ...saleForm,
                      productId: pid,
                    });
                  }}
                  required
                >
                  <option value="">Choose product...</option>
                  {productsData?.classifications?.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} ({p.stockLevel} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Mode</label>
                <select
                  className="form-select"
                  value={saleForm.paymentMethod}
                  onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="UPI">Mobile UPI</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowSaleModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGIN / DEMO MODAL */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                className="brand-icon"
                style={{ width: 48, height: 48, margin: '0 auto 12px', borderRadius: 12 }}
              >
                <Cpu size={26} color="#fff" />
              </div>
              <h3 style={{ fontSize: 22 }}>DemandSense AI</h3>
              <p className="modal-desc">
                {isRegister ? 'Register your store profile' : 'Sign in to access your business analytics'}
              </p>
            </div>

            {authError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {isRegister && (
                <>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={authForm.fullName}
                      onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Business / Store Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={authForm.businessName}
                      onChange={(e) => setAuthForm({ ...authForm, businessName: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>
                {isRegister ? 'Create Store Account' : 'Sign In with Demo Credentials'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>
                  {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                </span>
                <span
                  style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setIsRegister(!isRegister)}
                >
                  {isRegister ? 'Sign In' : 'Register New Store'}
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
