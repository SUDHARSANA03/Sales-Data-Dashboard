// static/app.js

const API_BASE = "http://127.0.0.1:8000/api";
let currentToken = localStorage.getItem("demandsense_token") || "";
let currentUser = null;
let charts = {}; // holds Chart.js instances

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventHandlers();
});

// Clock removed for desktop layout (no phone status bar)

// Initialize application state
function initApp() {
    lucide.createIcons();
    if (currentToken) {
        verifyTokenAndLoad();
    } else {
        showLoginOverlay();
    }
}

function showLoginOverlay() {
    const overlay = document.getElementById("login-overlay");
    const shell = document.getElementById("dashboard-shell");
    if (overlay) { overlay.classList.remove("hidden"); overlay.classList.add("active"); }
    if (shell) shell.classList.add("hidden");
}

function showDashboard() {
    const overlay = document.getElementById("login-overlay");
    const shell = document.getElementById("dashboard-shell");
    if (overlay) { overlay.classList.add("hidden"); overlay.classList.remove("active"); }
    if (shell) shell.classList.remove("hidden");
}

// Setup all click event handlers and form submissions
function setupEventHandlers() {
    // 1. Auth Tabs
    document.getElementById("auth-tab-login").addEventListener("click", () => toggleAuthTab("login"));
    document.getElementById("auth-tab-register").addEventListener("click", () => toggleAuthTab("register"));
    
    // 2. Auth Submissions
    document.getElementById("phone-login-form").addEventListener("submit", handleLogin);
    document.getElementById("phone-register-form").addEventListener("submit", handleRegister);
    
    // 3. Logout
    document.getElementById("phone-logout-btn").addEventListener("click", handleLogout);
    
    // 4. Phone Navigation clicks
    document.querySelectorAll(".phone-nav-item").forEach(item => {
        item.addEventListener("click", function() {
            document.querySelectorAll(".phone-nav-item").forEach(i => i.classList.remove("active"));
            this.classList.add("active");
        });
    });

    // 5. DB Reseed Demo data
    document.getElementById("phone-reseed-db-btn").addEventListener("click", triggerReseed);
    
    // 6. Reports downloads
    document.getElementById("phone-export-excel-btn").addEventListener("click", () => downloadReport("excel"));
    document.getElementById("phone-export-pdf-btn").addEventListener("click", () => downloadReport("pdf"));
    
    // 7. CRUD forms
    document.getElementById("phone-add-prod-btn").addEventListener("click", () => openProductForm(null));
    document.getElementById("product-crud-form").addEventListener("submit", handleProductSave);
    document.getElementById("phone-product-search").addEventListener("input", filterMobileProducts);
    
    // 8. Recording Sales Form Stepper
    document.getElementById("sale-qty-minus").addEventListener("click", () => adjustSaleQty(-1));
    document.getElementById("sale-qty-plus").addEventListener("click", () => adjustSaleQty(1));
    document.getElementById("sale-product-select").addEventListener("change", handleSaleProductChange);
    document.getElementById("sale-quantity").addEventListener("input", updateSaleInvoiceTotal);
    document.getElementById("sale-price-override").addEventListener("input", updateSaleInvoiceTotal);
    document.getElementById("record-sale-form").addEventListener("submit", handleRecordSale);

    // 9. Mobile Analytics Report Select
    document.getElementById("mobile-report-select").addEventListener("change", handleMobileReportSelectChange);
    document.getElementById("m-forecast-product-select").addEventListener("change", renderMobileForecastGraphsAndTables);
}

// Token helper headers
function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`
    };
}

// Toggle between Login & Register tabs in Phone view
function toggleAuthTab(mode) {
    document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    
    if (mode === "login") {
        document.getElementById("auth-tab-login").classList.add("active");
        document.getElementById("phone-login-form").classList.add("active");
    } else {
        document.getElementById("auth-tab-register").classList.add("active");
        document.getElementById("phone-register-form").classList.add("active");
    }
}

// Switch views in the desktop dashboard
function switchPhoneView(viewId) {
    if (!currentToken && viewId !== "auth") { showLoginOverlay(); return; }
    if (viewId === "auth") { showLoginOverlay(); return; }

    document.querySelectorAll(".phone-view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById(`phone-view-${viewId}`);
    if (target) target.classList.add("active");

    // Update sidebar nav active states
    document.querySelectorAll(".phone-nav-item").forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-view") === viewId) item.classList.add("active");
    });

    // Load data for the view
    if (currentToken) {
        if (viewId === "home")        fetchMobileSummary();
        if (viewId === "products")    loadMobileProducts();
        if (viewId === "record-sale") loadMobileSaleForm();
        if (viewId === "analytics")   loadMobileAnalytics();
        if (viewId === "alerts")      loadMobileAlerts();
    }
}

// Check backend JWT validation
async function verifyTokenAndLoad() {
    try {
        const res = await fetch(`${API_BASE}/auth/profile`, { headers: getHeaders() });
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById("phone-owner-name").innerText = currentUser.full_name;
            document.getElementById("phone-biz-name").innerText = currentUser.business.name;
            document.getElementById("phone-biz-cat").innerText = currentUser.business.category;
            document.getElementById("phone-biz-addr").innerHTML = `<i data-lucide="map-pin"></i> ${currentUser.business.address || "Address not set"}`;
            // Update top-bar avatar initials
            const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
            const av = document.getElementById("top-avatar");
            if (av) av.innerText = initials;
            lucide.createIcons();
            showDashboard();
            switchPhoneView("home");
            reloadAllBIDashboards();
        } else {
            handleLogout();
        }
    } catch (err) {
        console.error("Connection failed", err);
        showLoginOverlay();
    }
}

// User Action: Log In
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ username: email, password: password })
        });
        if (response.ok) {
            const data = await response.json();
            currentToken = data.access_token;
            localStorage.setItem("demandsense_token", currentToken);
            verifyTokenAndLoad();
        } else {
            const err = await response.json();
            alert(`Login Failed: ${err.detail}`);
        }
    } catch (err) {
        alert("API connection failed. Make sure backend server is running on port 8000.");
    }
}

// User Action: Register
async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const category = document.getElementById("reg-category").value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password, full_name: fullName })
        });
        
        if (response.ok) {
            alert("Registration successful! Logging in now.");
            // Auto login after register
            const loginRes = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username: email, password: password })
            });
            if (loginRes.ok) {
                const data = await loginRes.json();
                currentToken = data.access_token;
                localStorage.setItem("demandsense_token", currentToken);
                
                // Set business profile categories
                await fetch(`${API_BASE}/auth/business`, {
                    method: "PUT",
                    headers: getHeaders(),
                    body: JSON.stringify({ name: `${fullName}'s Store`, category: category })
                });
                
                verifyTokenAndLoad();
            }
        } else {
            const err = await response.json();
            alert(`Registration Failed: ${err.detail}`);
        }
    } catch (err) {
        alert("Server connection failed.");
    }
}

// User Action: Log Out
function handleLogout() {
    currentToken = "";
    currentUser = null;
    localStorage.removeItem("demandsense_token");
    showLoginOverlay();
}

// Reset/Seed Database Endpoint
async function triggerReseed() {
    if (!confirm("Are you sure you want to restore the default grocery dataset? This will overwrite recent modifications.")) return;
    
    try {
        const res = await fetch(`${API_BASE}/reports/seed`, { method: "POST" });
        if (res.ok) {
            alert("Sample database seeded successfully!");
            if (currentToken) {
                verifyTokenAndLoad();
            } else {
                // If not logged in, auto-login with seeded owner
                document.getElementById("login-email").value = "owner@demandsense.com";
                document.getElementById("login-password").value = "password123";
                // Trigger auto-click login
                document.getElementById("phone-login-form").dispatchEvent(new Event('submit'));
            }
        } else {
            alert("Seed failed.");
        }
    } catch (err) {
        alert("Failed to hit seeder API endpoint.");
    }
}

// Report downloader trigger
function downloadReport(format) {
    if (!currentToken) {
        alert("Please register or log in on the phone emulator to download records.");
        return;
    }
    const endpoint = format === "excel" ? "excel" : "pdf";
    window.open(`${API_BASE}/reports/${endpoint}?token=${currentToken}`, "_blank");
}


// ========================================================
// MOBILE VIEWS LOADERS
// ========================================================

async function fetchMobileSummary() {
    try {
        const res = await fetch(`${API_BASE}/analytics/summary`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            document.getElementById("phone-stat-revenue").innerText = `₹${data.total_revenue.toLocaleString()}`;
            document.getElementById("phone-stat-stock").innerText = `₹${data.inventory_value.toLocaleString()}`;
            document.getElementById("phone-health-score-text").innerText = `${data.business_health_score}%`;
            
            // Draw radial circular progress
            const strokeVal = `${data.business_health_score}, 100`;
            document.getElementById("phone-health-progress").setAttribute("stroke-dasharray", strokeVal);
            
            // Set circle color based on health
            const color = data.business_health_score >= 80 ? "#10b981" : (data.business_health_score >= 60 ? "#f59e0b" : "#ef4444");
            document.getElementById("phone-health-progress").style.stroke = color;
        }
        
        // Fetch sales trend for desktop home chart
        const salesRes = await fetch(`${API_BASE}/analytics/sales`, { headers: getHeaders() });
        if (salesRes.ok) {
            const salesData = await salesRes.json();
            const recent = salesData.daily_sales.slice(-7);
            const dates = recent.map(r => r.date.substring(5));
            const sales = recent.map(r => r.sales);

            destroyChart("mobileHomeSales");
            const ctxMobile = document.getElementById("chart-mobile-home-sales").getContext("2d");

            // Gradient fill
            const grad = ctxMobile.createLinearGradient(0, 0, 0, 250);
            grad.addColorStop(0, 'rgba(59,130,246,0.45)');
            grad.addColorStop(1, 'rgba(59,130,246,0.0)');

            charts.mobileHomeSales = new Chart(ctxMobile, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        data: sales,
                        borderColor: '#3b82f6',
                        backgroundColor: grad,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.45,
                        pointRadius: 5,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: '#60a5fa',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 1000, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)',
                            borderColor: 'rgba(59,130,246,0.4)',
                            borderWidth: 1,
                            titleColor: '#94a3b8',
                            bodyColor: '#f8fafc',
                            bodyFont: { size: 13, weight: 'bold' },
                            padding: 12,
                            cornerRadius: 10,
                            callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString()}` }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                            ticks: { color: '#64748b', font: { size: 11 }, callback: v => '₹' + v.toLocaleString() }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error(err);
    }
}

let cachedProducts = [];

async function loadMobileProducts() {
    const listContainer = document.getElementById("phone-product-list-container");
    listContainer.innerHTML = `<div class="no-forecast-selected"><i data-lucide="loader"></i><p>Loading catalog...</p></div>`;
    lucide.createIcons();
    
    try {
        const res = await fetch(`${API_BASE}/products`, { headers: getHeaders() });
        if (res.ok) {
            cachedProducts = await res.json();
            renderMobileProductList(cachedProducts);
        }
    } catch (e) {
        listContainer.innerHTML = `<p style='text-align:center;padding:20px;font-size:11px;color:red;'>Failed to load inventory.</p>`;
    }
}

function renderMobileProductList(prods) {
    const listContainer = document.getElementById("phone-product-list-container");
    if (prods.length === 0) {
        listContainer.innerHTML = `<div class="no-forecast-selected"><i data-lucide="package-open"></i><p>No products in inventory.</p></div>`;
        lucide.createIcons();
        return;
    }
    
    listContainer.innerHTML = prods.map(p => {
        const isLow = p.current_stock <= p.min_reorder_qty;
        const statusClass = isLow ? "low" : "healthy";
        const statusText = isLow ? "Low Stock" : "In Stock";
        
        return `
            <div class="mobile-product-card">
                <div class="prod-details">
                    <h4>${p.name} <span class="stock-status-tag ${statusClass}">${statusText}</span></h4>
                    <p>Category: ${p.category} | Stock: <b>${p.current_stock}</b> pcs</p>
                    <p class="prod-prices">Cost: ₹${p.purchase_price.toFixed(2)} | Sell: ₹${p.selling_price.toFixed(2)}</p>
                </div>
                <div class="prod-actions">
                    <button class="prod-act-btn edit" onclick="openProductForm(${p.id})"><i data-lucide="edit-3"></i></button>
                    <button class="prod-act-btn delete" onclick="deleteMobileProduct(${p.id})"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
}

function filterMobileProducts() {
    const query = document.getElementById("phone-product-search").value.toLowerCase();
    const filtered = cachedProducts.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
    renderMobileProductList(filtered);
}

function openProductForm(prodId = null) {
    switchPhoneView("product-form");
    const titleEl = document.getElementById("product-form-title");
    const form = document.getElementById("product-crud-form");
    form.reset();
    
    if (prodId) {
        titleEl.innerText = "Edit Product";
        const p = cachedProducts.find(x => x.id === prodId);
        if (p) {
            document.getElementById("crud-prod-id").value = p.id;
            document.getElementById("crud-name").value = p.name;
            document.getElementById("crud-category").value = p.category;
            document.getElementById("crud-purchase-price").value = p.purchase_price;
            document.getElementById("crud-selling-price").value = p.selling_price;
            document.getElementById("crud-stock").value = p.current_stock;
            document.getElementById("crud-reorder-qty").value = p.min_reorder_qty;
            document.getElementById("crud-supplier").value = p.supplier_name || "";
            document.getElementById("crud-contact").value = p.supplier_contact || "";
        }
    } else {
        titleEl.innerText = "Add Product";
        document.getElementById("crud-prod-id").value = "";
    }
}

async function handleProductSave(e) {
    e.preventDefault();
    const pId = document.getElementById("crud-prod-id").value;
    
    const payload = {
        name: document.getElementById("crud-name").value,
        category: document.getElementById("crud-category").value,
        purchase_price: parseFloat(document.getElementById("crud-purchase-price").value),
        selling_price: parseFloat(document.getElementById("crud-selling-price").value),
        current_stock: parseInt(document.getElementById("crud-stock").value),
        min_reorder_qty: parseInt(document.getElementById("crud-reorder-qty").value),
        supplier_name: document.getElementById("crud-supplier").value || null,
        supplier_contact: document.getElementById("crud-contact").value || null
    };
    
    const url = pId ? `${API_BASE}/products/${pId}` : `${API_BASE}/products`;
    const method = pId ? "PUT" : "POST";
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            alert("Product saved successfully.");
            switchPhoneView("products");
            reloadAllBIDashboards();
        } else {
            const err = await res.json();
            alert(`Error: ${err.detail}`);
        }
    } catch (e) {
        alert("Failed to connect to backend API.");
    }
}

async function deleteMobileProduct(prodId) {
    if (!confirm("Are you sure you want to delete this product? All historical transactions remain intact but product will be uncatalogued.")) return;
    try {
        const res = await fetch(`${API_BASE}/products/${prodId}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        if (res.ok) {
            loadMobileProducts();
            reloadAllBIDashboards();
        }
    } catch (err) {
        alert("Delete request failed.");
    }
}

// Sales transactions
async function loadMobileSaleForm() {
    const prodSelect = document.getElementById("sale-product-select");
    const custSelect = document.getElementById("sale-customer-select");
    
    prodSelect.innerHTML = `<option value="">Choose item...</option>`;
    
    try {
        // Fetch products & customers
        const [prodRes, custRes] = await Promise.all([
            fetch(`${API_BASE}/products`, { headers: getHeaders() }),
            fetch(`${API_BASE}/customers`, { headers: getHeaders() })
        ]);
        
        if (prodRes.ok) {
            const prods = await prodRes.json();
            cachedProducts = prods;
            prodSelect.innerHTML += prods.map(p => `<option value="${p.id}" data-price="${p.selling_price}" data-stock="${p.current_stock}">${p.name} (₹${p.selling_price.toFixed(2)})</option>`).join('');
        }
        
        if (custRes.ok) {
            const custs = await custRes.json();
            custSelect.innerHTML = `<option value="">Walk-in Customer (None)</option>` + 
                custs.map(c => `<option value="${c.id}">${c.name} (${c.segment})</option>`).join('');
        }
        
        document.getElementById("sale-quantity").value = 1;
        document.getElementById("sale-price-override").value = "";
        document.getElementById("sale-total-val").innerText = "₹0.00";
        document.getElementById("sale-stock-hint").innerText = "Available: --";
        
    } catch (e) {
        console.error("Form load failed", e);
    }
}

function handleSaleProductChange() {
    const select = document.getElementById("sale-product-select");
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        document.getElementById("sale-stock-hint").innerText = "Available: 0 units";
        updateSaleInvoiceTotal();
        return;
    }
    
    const stock = selectedOption.getAttribute("data-stock");
    document.getElementById("sale-stock-hint").innerText = `Available: ${stock} units`;
    updateSaleInvoiceTotal();
}

function adjustSaleQty(delta) {
    const input = document.getElementById("sale-quantity");
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
    updateSaleInvoiceTotal();
}

function updateSaleInvoiceTotal() {
    const select = document.getElementById("sale-product-select");
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        document.getElementById("sale-total-val").innerText = "₹0.00";
        return;
    }
    
    const defaultPrice = parseFloat(selectedOption.getAttribute("data-price"));
    const overridePrice = parseFloat(document.getElementById("sale-price-override").value);
    const price = isNaN(overridePrice) ? defaultPrice : overridePrice;
    
    const qty = parseInt(document.getElementById("sale-quantity").value) || 0;
    const total = qty * price;
    
    document.getElementById("sale-total-val").innerText = `₹${total.toFixed(2)}`;
}

async function handleRecordSale(e) {
    e.preventDefault();
    const select = document.getElementById("sale-product-select");
    const pId = select.value;
    const qty = parseInt(document.getElementById("sale-quantity").value);
    const price = parseFloat(document.getElementById("sale-price-override").value) || null;
    const cId = document.getElementById("sale-customer-select").value || null;
    const payMode = document.getElementById("sale-payment-method").value;
    
    if (!pId) {
        alert("Please select a product.");
        return;
    }
    
    const payload = {
        product_id: parseInt(pId),
        quantity: qty,
        unit_price: price,
        customer_id: cId ? parseInt(cId) : null,
        payment_method: payMode
    };
    
    try {
        const res = await fetch(`${API_BASE}/sales`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            alert("Sale recorded successfully!");
            switchPhoneView("home");
            reloadAllBIDashboards();
        } else {
            const err = await res.json();
            alert(`Failed: ${err.detail}`);
        }
    } catch (e) {
        alert("API request failed.");
    }
}

// Forecast Screen inside phone
async function loadMobileForecastForm() {
    const select = document.getElementById("phone-forecast-prod-select");
    select.innerHTML = `<option value="">Choose product...</option>`;
    
    try {
        const res = await fetch(`${API_BASE}/products`, { headers: getHeaders() });
        if (res.ok) {
            const prods = await res.json();
            select.innerHTML += prods.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    } catch (e) {
        console.error(e);
    }
    
    document.getElementById("phone-forecast-metrics-wrap").style.display = "none";
    document.getElementById("phone-forecast-empty-state").style.display = "flex";
}

async function handleMobileForecastChange() {
    const pId = document.getElementById("phone-forecast-prod-select").value;
    const metricsWrap = document.getElementById("phone-forecast-metrics-wrap");
    const emptyState = document.getElementById("phone-forecast-empty-state");
    
    if (!pId) {
        metricsWrap.style.display = "none";
        emptyState.style.display = "flex";
        return;
    }
    
    emptyState.style.display = "none";
    metricsWrap.style.display = "grid";
    
    try {
        // Fetch forecasts from overall forecast endpoint
        const res = await fetch(`${API_BASE}/analytics/forecast`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            const prodF = data.product_forecasts.find(f => f.product_id === parseInt(pId));
            
            if (prodF) {
                document.getElementById("phone-forecast-week").innerText = `${prodF.next_week_demand.toFixed(1)} units`;
                document.getElementById("phone-forecast-month").innerText = `${prodF.next_month_demand.toFixed(1)} units`;
                document.getElementById("phone-forecast-reorder").innerText = `${prodF.suggested_reorder} units`;
                
                const stockout = prodF.expected_stockout_days;
                const card = document.getElementById("phone-forecast-stockout-card");
                
                if (stockout < 0) {
                    document.getElementById("phone-forecast-stockout").innerText = "Never";
                    card.style.borderColor = "rgba(255,255,255,0.05)";
                    card.style.background = "transparent";
                } else {
                    document.getElementById("phone-forecast-stockout").innerText = `${stockout} days`;
                    if (stockout <= 5) {
                        card.style.borderColor = "rgba(239, 68, 68, 0.4)";
                        card.style.background = "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(239, 68, 68, 0.05))";
                    } else {
                        card.style.borderColor = "rgba(255,255,255,0.05)";
                        card.style.background = "transparent";
                    }
                }
                
                // Plot mobile forecast chart
                const recentF = prodF.forecast_points.slice(0, 10);
                const forecastDates = recentF.map(pt => pt.date.substring(5)); // MM-DD
                const forecastValues = recentF.map(pt => pt.forecasted_demand);
                
                destroyChart("mobileForecast");
                const ctxMobileF = document.getElementById("chart-mobile-forecast").getContext("2d");
                charts.mobileForecast = new Chart(ctxMobileF, {
                    type: 'line',
                    data: {
                        labels: forecastDates,
                        datasets: [{
                            data: forecastValues,
                            borderColor: '#10b981',
                            borderDash: [3, 3],
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            borderWidth: 1.5,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 } } },
                            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b', font: { size: 8 } } }
                        }
                    }
                });
            } else {
                // Heuristic backup if model didn't train
                document.getElementById("phone-forecast-week").innerText = "22.5 units";
                document.getElementById("phone-forecast-month").innerText = "90.0 units";
                document.getElementById("phone-forecast-stockout").innerText = "12 days";
                document.getElementById("phone-forecast-reorder").innerText = "15 units";
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// Alerts notifications
async function loadMobileAlerts() {
    const list = document.getElementById("phone-notifications-list");
    list.innerHTML = `<div class="no-forecast-selected"><i data-lucide="loader"></i><p>Loading...</p></div>`;
    lucide.createIcons();
    
    try {
        const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
        if (res.ok) {
            const alerts = await res.json();
            
            // Update unread count badges
            const unreadCount = alerts.filter(a => !a.is_read).length;
            updateNotificationBadges(unreadCount);
            
            if (alerts.length === 0) {
                list.innerHTML = `<div class="no-forecast-selected"><i data-lucide="check-circle-2"></i><p>No recent alerts.</p></div>`;
                lucide.createIcons();
                return;
            }
            
            list.innerHTML = alerts.map(a => {
                const readBtn = a.is_read ? '' : `<button class="notif-read-btn" onclick="markAlertAsRead(${a.id})">Mark read</button>`;
                const unreadClass = a.is_read ? '' : 'unread';
                
                return `
                    <div class="notif-item ${a.type} ${unreadClass}">
                        <p class="notif-msg">${a.message}</p>
                        <div class="notif-meta">
                            <span>Date: ${a.date}</span>
                            ${readBtn}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (e) {
        list.innerHTML = `<p style="text-align:center;padding:20px;font-size:11px;color:red;">Error loading notifications.</p>`;
    }
}

function updateNotificationBadges(count) {
    const headerBadge = document.getElementById("phone-notif-count-header");
    const navDot = document.getElementById("phone-nav-bell-badge");
    
    headerBadge.innerText = count;
    if (count > 0) {
        navDot.style.display = "block";
    } else {
        navDot.style.display = "none";
    }
}

async function markAlertAsRead(id) {
    try {
        const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
            method: "POST",
            headers: getHeaders()
        });
        if (res.ok) {
            loadMobileAlerts();
            // Reload BI dashboard metrics if executive summary is open
            const activeTab = document.querySelector(".bi-tab-btn.active").getAttribute("data-tab");
            if (activeTab === "executive") fetchSummaryMetrics();
        }
    } catch (err) {
        console.error(err);
    }
}


// // ========================================================
// MOBILE BI DASHBOARD LOADERS
// ========================================================

// Reloads active mobile report & updates notification count
function reloadAllBIDashboards() {
    const analyticsView = document.getElementById("phone-view-analytics");
    if (analyticsView && analyticsView.classList.contains("active")) {
        const reportVal = document.getElementById("mobile-report-select").value;
        loadMobileAnalyticsReport(reportVal);
    }
    
    // Always trigger notifications count for phone emulator updates
    fetchMobileNotificationsCount();
}

async function fetchMobileNotificationsCount() {
    try {
        const res = await fetch(`${API_BASE}/notifications?unread_only=true`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            updateNotificationBadges(data.length);
        }
    } catch (e) {
        console.error(e);
    }
}

// Clean helper to destroy old Chart.js elements
function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        delete charts[name];
    }
}

// Entry point for loading/refreshing mobile analytics view
async function loadMobileAnalytics() {
    const val = document.getElementById("mobile-report-select").value;
    
    // Hide all report sections
    document.querySelectorAll(".mobile-report-section").forEach(sec => sec.classList.remove("active"));
    
    // Show selected section
    const targetSec = document.getElementById(`m-report-${val}`);
    if (targetSec) {
        targetSec.classList.add("active");
    }
    
    await loadMobileAnalyticsReport(val);
}

// Handler for mobile report selector dropdown change
async function handleMobileReportSelectChange() {
    const val = document.getElementById("mobile-report-select").value;
    
    // Hide all report sections
    document.querySelectorAll(".mobile-report-section").forEach(sec => sec.classList.remove("active"));
    
    // Show selected section
    const targetSec = document.getElementById(`m-report-${val}`);
    if (targetSec) {
        targetSec.classList.add("active");
    }
    
    if (currentToken) {
        await loadMobileAnalyticsReport(val);
    }
}

async function loadMobileAnalyticsReport(reportType) {
    if (reportType === "executive") {
        await loadMobileExecutiveReport();
    } else if (reportType === "sales") {
        await loadMobileSalesReport();
    } else if (reportType === "products") {
        await loadMobileProductsReport();
    } else if (reportType === "inventory") {
        await loadMobileInventoryReport();
    } else if (reportType === "forecast") {
        await loadMobileForecastReport();
    } else if (reportType === "customers") {
        await loadMobileCustomersReport();
    }
}

// SUB-REPORT 1: EXECUTIVE
async function loadMobileExecutiveReport() {
    try {
        const [sumRes, salesRes, prodRes] = await Promise.all([
            fetch(`${API_BASE}/analytics/summary`, { headers: getHeaders() }),
            fetch(`${API_BASE}/analytics/sales`, { headers: getHeaders() }),
            fetch(`${API_BASE}/products`, { headers: getHeaders() })
        ]);
        
        if (sumRes.ok) {
            const data = await sumRes.json();
            document.getElementById("m-metric-revenue").innerText = `₹${data.total_revenue.toLocaleString()}`;
            document.getElementById("m-metric-profit").innerText = `₹${data.total_profit.toLocaleString()}`;
            document.getElementById("m-metric-sales").innerText = data.total_sales.toLocaleString();
            document.getElementById("m-metric-stock").innerText = `₹${data.inventory_value.toLocaleString()}`;
            document.getElementById("m-metric-health").innerText = data.business_health_score.toFixed(1);
            
            const marginPct = data.total_revenue > 0 ? ((data.total_profit / data.total_revenue) * 100.0).toFixed(1) : 0;
            document.getElementById("m-metric-margin").innerText = `${marginPct}%`;
        }
        
        if (salesRes.ok) {
            const salesData = await salesRes.json();
            destroyChart("mExecSalesProfit");

            const dates    = salesData.daily_sales.slice(-7).map(s => s.date.substring(5));
            const revenues = salesData.daily_sales.slice(-7).map(s => s.sales);
            const profits  = revenues.map(r => r * 0.42);

            const ctx = document.getElementById("m-chart-exec-sales-profit").getContext("2d");
            const revGrad = ctx.createLinearGradient(0, 0, 0, 250);
            revGrad.addColorStop(0, 'rgba(59,130,246,0.5)');
            revGrad.addColorStop(1, 'rgba(59,130,246,0.0)');

            charts.mExecSalesProfit = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Revenue',
                            data: revenues,
                            borderColor: '#3b82f6',
                            backgroundColor: revGrad,
                            fill: true, tension: 0.45, borderWidth: 3,
                            pointRadius: 4, pointBackgroundColor: '#3b82f6',
                            pointBorderColor: '#fff', pointBorderWidth: 2,
                            pointHoverRadius: 7,
                        },
                        {
                            label: 'Profit',
                            data: profits,
                            borderColor: '#10b981',
                            backgroundColor: 'transparent',
                            fill: false, tension: 0.45, borderWidth: 2.5,
                            borderDash: [6, 3],
                            pointRadius: 4, pointBackgroundColor: '#10b981',
                            pointBorderColor: '#fff', pointBorderWidth: 2,
                            pointHoverRadius: 7,
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 900, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: {
                            display: true, position: 'top',
                            labels: { color: '#94a3b8', boxWidth: 10, font: { size: 11 }, padding: 16 }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)',
                            borderColor: 'rgba(59,130,246,0.4)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc',
                            bodyFont: { size: 13, weight: 'bold' },
                            padding: 12, cornerRadius: 10,
                            callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString()}` }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '₹' + v.toLocaleString() } }
                    }
                }
            });
        }

        if (prodRes.ok) {
            const prodData = await prodRes.json();
            destroyChart("mExecInventoryCat");

            const catMap = {};
            prodData.forEach(p => {
                const val = p.current_stock * p.purchase_price;
                catMap[p.category] = (catMap[p.category] || 0) + val;
            });
            const categories = Object.keys(catMap);
            const values     = Object.values(catMap);
            const VIBRANT = ['#3b82f6','#10b981','#f59e0b','#a855f7','#ef4444','#14b8a6','#6366f1'];

            const ctx2 = document.getElementById("m-chart-exec-inventory-category").getContext("2d");
            charts.mExecInventoryCat = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: values,
                        backgroundColor: VIBRANT,
                        borderWidth: 3, borderColor: '#0f172a',
                        hoverOffset: 12, hoverBorderWidth: 0,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { animateRotate: true, duration: 900 },
                    cutout: '62%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 11 }, padding: 12 } },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)',
                            borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc',
                            bodyFont: { size: 13, weight: 'bold' }, padding: 12, cornerRadius: 10,
                            callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString()}` }
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}

// SUB-REPORT 2: SALES
async function loadMobileSalesReport() {
    try {
        const res = await fetch(`${API_BASE}/analytics/sales`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            
            document.getElementById("m-sales-revenue").innerText = `₹${data.total_revenue.toLocaleString()}`;
            
            const avgDaily = data.daily_sales.length > 0 ? (data.total_revenue / data.daily_sales.length) : 0;
            document.getElementById("m-sales-daily-avg").innerText = `₹${avgDaily.toFixed(2)}`;
            
            document.getElementById("m-sales-growth").innerText = `${data.revenue_growth_pct.toFixed(1)}%`;
            
            // --- Daily Sales (Gradient Line) ---
            destroyChart("mSalesDailyTrend");
            const ctxDaily = document.getElementById("m-chart-sales-daily-trend").getContext("2d");
            const dailyGrad = ctxDaily.createLinearGradient(0, 0, 0, 250);
            dailyGrad.addColorStop(0, 'rgba(99,102,241,0.5)');
            dailyGrad.addColorStop(1, 'rgba(99,102,241,0.0)');
            charts.mSalesDailyTrend = new Chart(ctxDaily, {
                type: 'line',
                data: {
                    labels: data.daily_sales.slice(-7).map(s => s.date.substring(5)),
                    datasets: [{
                        data: data.daily_sales.slice(-7).map(s => s.sales),
                        borderColor: '#6366f1',
                        backgroundColor: dailyGrad,
                        fill: true, tension: 0.45, borderWidth: 3,
                        pointRadius: 5, pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff', pointBorderWidth: 2,
                        pointHoverRadius: 8,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 900, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(99,102,241,0.4)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc', bodyFont: { size: 13, weight: 'bold' },
                            padding: 12, cornerRadius: 10, callbacks: { label: c => ` ₹${c.raw.toLocaleString()}` }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '₹' + v.toLocaleString() } }
                    }
                }
            });

            // --- Weekly Sales (Gradient Bars) ---
            destroyChart("mSalesWeekly");
            const ctxWeekly = document.getElementById("m-chart-sales-weekly").getContext("2d");
            const weeklyGrad = ctxWeekly.createLinearGradient(0, 0, 0, 250);
            weeklyGrad.addColorStop(0, '#10b981');
            weeklyGrad.addColorStop(1, 'rgba(16,185,129,0.2)');
            charts.mSalesWeekly = new Chart(ctxWeekly, {
                type: 'bar',
                data: {
                    labels: data.weekly_sales.map(w => `W${w.week.slice(6)}`),
                    datasets: [{
                        data: data.weekly_sales.map(w => w.sales),
                        backgroundColor: weeklyGrad,
                        borderRadius: 8, borderSkipped: false,
                        hoverBackgroundColor: '#34d399',
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 900, easing: 'easeOutBounce' },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(16,185,129,0.4)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc', bodyFont: { size: 13, weight: 'bold' },
                            padding: 12, cornerRadius: 10, callbacks: { label: c => ` ₹${c.raw.toLocaleString()}` }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '₹' + v.toLocaleString() } }
                    }
                }
            });

            // --- Monthly Sales (Gradient Bars) ---
            destroyChart("mSalesMonthly");
            const ctxMonthly = document.getElementById("m-chart-sales-monthly").getContext("2d");
            const monthlyGrad = ctxMonthly.createLinearGradient(0, 0, 0, 250);
            monthlyGrad.addColorStop(0, '#f59e0b');
            monthlyGrad.addColorStop(1, 'rgba(245,158,11,0.15)');
            charts.mSalesMonthly = new Chart(ctxMonthly, {
                type: 'bar',
                data: {
                    labels: data.monthly_sales.map(m => m.month),
                    datasets: [{
                        data: data.monthly_sales.map(m => m.sales),
                        backgroundColor: monthlyGrad,
                        borderRadius: 8, borderSkipped: false,
                        hoverBackgroundColor: '#fcd34d',
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 900, easing: 'easeOutBounce' },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(245,158,11,0.4)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc', bodyFont: { size: 13, weight: 'bold' },
                            padding: 12, cornerRadius: 10, callbacks: { label: c => ` ₹${c.raw.toLocaleString()}` }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '₹' + v.toLocaleString() } }
                    }
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}

// SUB-REPORT 3: PRODUCTS
async function loadMobileProductsReport() {
    try {
        const [prodRes, productsRes] = await Promise.all([
            fetch(`${API_BASE}/analytics/products`, { headers: getHeaders() }),
            fetch(`${API_BASE}/products`, { headers: getHeaders() })
        ]);
        
        if (prodRes.ok && productsRes.ok) {
            const data = await prodRes.json();
            
            // --- Top Selling (Horizontal Gradient Bars) ---
            destroyChart("mProductsTopSelling");
            const ctxTop = document.getElementById("m-chart-products-top-selling").getContext("2d");
            const topN = data.top_selling.slice(0, 5);
            const topColors = ['#3b82f6','#6366f1','#a855f7','#ec4899','#14b8a6'];
            charts.mProductsTopSelling = new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: topN.map(t => t.product_name),
                    datasets: [{
                        data: topN.map(t => t.quantity_sold),
                        backgroundColor: topColors,
                        borderRadius: 8, borderSkipped: false,
                        hoverBackgroundColor: topColors.map(c => c + 'cc'),
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 900, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(99,102,241,0.4)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc', bodyFont: { size: 13, weight: 'bold' },
                            padding: 12, cornerRadius: 10, callbacks: { label: c => ` ${c.raw} units sold` }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
                        y: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 11 } } }
                    }
                }
            });

            // --- Velocity Doughnut (Rich colours) ---
            const counts = { "Fast Moving": 0, "Medium Moving": 0, "Slow Moving": 0, "Dead Stock": 0 };
            data.classifications.forEach(c => { counts[c.classification] = (counts[c.classification] || 0) + 1; });

            destroyChart("mProductsVelocityDist");
            const ctxDist = document.getElementById("m-chart-products-velocity-distribution").getContext("2d");
            charts.mProductsVelocityDist = new Chart(ctxDist, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{
                        data: Object.values(counts),
                        backgroundColor: ['#10b981','#3b82f6','#f59e0b','#ef4444'],
                        borderWidth: 3, borderColor: '#0f172a',
                        hoverOffset: 12, hoverBorderWidth: 0,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { animateRotate: true, duration: 900 },
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 11 }, padding: 12 } },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc', bodyFont: { size: 13, weight: 'bold' },
                            padding: 12, cornerRadius: 10
                        }
                    }
                }
            });
            
            // Ledger
            const tbody = document.getElementById("m-product-classification-tbody");
            tbody.innerHTML = data.classifications.map(c => {
                const velocityClass = c.classification.toLowerCase().replace(" ", "-");
                let badgeClass = "medium";
                if (velocityClass === "fast-moving") badgeClass = "fast";
                if (velocityClass === "slow-moving") badgeClass = "slow";
                if (velocityClass === "dead-stock") badgeClass = "dead";
                
                return `
                    <tr>
                        <td><b>${c.product_name}</b></td>
                        <td>${c.stock_level} units</td>
                        <td><span class="bi-status-badge ${badgeClass}" style="font-size: 8px; padding: 1px 4px;">${c.classification.split(' ')[0]}</span></td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

// SUB-REPORT 4: INVENTORY
async function loadMobileInventoryReport() {
    try {
        const [prodRes, productsRes] = await Promise.all([
            fetch(`${API_BASE}/analytics/products`, { headers: getHeaders() }),
            fetch(`${API_BASE}/products`, { headers: getHeaders() })
        ]);
        
        if (prodRes.ok && productsRes.ok) {
            const data = await prodRes.json();
            
            const lowStockCount = data.classifications.filter(c => c.stock_level <= c.min_reorder_qty).length;
            const overstockCount = data.classifications.filter(c => c.recommendation === "Buy Less").length;
            const healthyCount = data.classifications.length - lowStockCount - overstockCount;
            
            document.getElementById("m-inv-low-count").innerText = lowStockCount;
            document.getElementById("m-inv-overstock-count").innerText = overstockCount;
            document.getElementById("m-inv-healthy-count").innerText = healthyCount;
            
            destroyChart("mInventoryAlertsGauge");
            const ctxGauge = document.getElementById("m-chart-inventory-alerts-gauge").getContext("2d");
            charts.mInventoryAlertsGauge = new Chart(ctxGauge, {
                type: 'doughnut',
                data: {
                    labels: ['Low Stock', 'Overstock', 'Healthy'],
                    datasets: [{
                        data: [lowStockCount, overstockCount, healthyCount],
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                        borderWidth: 4, borderColor: '#0f172a',
                        hoverOffset: 14, hoverBorderWidth: 0,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { animateRotate: true, duration: 1000 },
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 12 }, padding: 14 } },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                            titleColor: '#94a3b8', bodyColor: '#f8fafc', bodyFont: { size: 13, weight: 'bold' },
                            padding: 12, cornerRadius: 10, callbacks: { label: c => ` ${c.raw} products` }
                        }
                    }
                }
            });
            
            // Replenish recommendation table
            const tbody = document.getElementById("m-inventory-replenish-tbody");
            tbody.innerHTML = data.classifications.map(c => {
                const recClass = c.recommendation.toLowerCase().replace(" ", "-");
                let statusBadgeClass = "do-not";
                if (recClass === "restock") statusBadgeClass = "restock";
                if (recClass === "buy-more") statusBadgeClass = "buy_more";
                if (recClass === "buy-less") statusBadgeClass = "buy_less";
                
                return `
                    <tr>
                        <td><b>${c.product_name}</b></td>
                        <td><b>${c.suggested_reorder_qty}</b></td>
                        <td><span class="bi-status-badge ${statusBadgeClass}" style="font-size: 8px; padding: 1px 4px;">${c.recommendation}</span></td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

// SUB-REPORT 5: DEMAND FORECAST
let cachedMobileForecast = null;

async function loadMobileForecastReport() {
    const selector = document.getElementById("m-forecast-product-select");
    try {
        const res = await fetch(`${API_BASE}/analytics/forecast`, { headers: getHeaders() });
        if (res.ok) {
            cachedMobileForecast = await res.json();
            
            // Populate select dropdown
            const currentVal = selector.value || "All";
            selector.innerHTML = `<option value="All">Overall Store Sales</option>` + 
                cachedMobileForecast.product_forecasts.map(pf => `<option value="${pf.product_id}">${pf.product_name}</option>`).join('');
            selector.value = currentVal;
            
            renderMobileForecastGraphsAndTables();
        }
    } catch (e) {
        console.error(e);
    }
}

function renderMobileForecastGraphsAndTables() {
    if (!cachedMobileForecast) return;
    
    const focusId = document.getElementById("m-forecast-product-select").value;
    const metricsWrap = document.getElementById("m-forecast-metrics-wrap");
    
    destroyChart("mForecastOverall");
    const ctx = document.getElementById("m-chart-forecast-overall").getContext("2d");
    
    let chartLabels = [];
    let forecastData = [];
    
    if (focusId === "All") {
        if (metricsWrap) metricsWrap.style.display = "none";
        
        chartLabels = cachedMobileForecast.overall_sales_forecast.slice(0, 10).map(f => f.date.substring(5)); // MM-DD
        forecastData = cachedMobileForecast.overall_sales_forecast.slice(0, 10).map(f => f.forecasted_sales);
    } else {
        if (metricsWrap) metricsWrap.style.display = "grid";
        
        const prodF = cachedMobileForecast.product_forecasts.find(f => f.product_id === parseInt(focusId));
        if (prodF) {
            chartLabels = prodF.forecast_points.slice(0, 10).map(pt => pt.date.substring(5)); // MM-DD
            forecastData = prodF.forecast_points.slice(0, 10).map(pt => pt.forecasted_demand);
            
            // Populate metric cards
            document.getElementById("m-forecast-week").innerText = `${prodF.next_week_demand.toFixed(1)} units`;
            document.getElementById("m-forecast-month").innerText = `${prodF.next_month_demand.toFixed(1)} units`;
            document.getElementById("m-forecast-reorder").innerText = `${prodF.suggested_reorder} units`;
            
            const stockout = prodF.expected_stockout_days;
            const card = document.getElementById("m-forecast-stockout-card");
            
            if (stockout < 0) {
                document.getElementById("m-forecast-stockout").innerText = "Never";
                if (card) {
                    card.style.borderColor = "rgba(255,255,255,0.05)";
                    card.style.background = "transparent";
                }
            } else {
                document.getElementById("m-forecast-stockout").innerText = `${stockout} days`;
                if (card) {
                    if (stockout <= 5) {
                        card.style.borderColor = "rgba(239, 68, 68, 0.4)";
                        card.style.background = "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(239, 68, 68, 0.05))";
                    } else {
                        card.style.borderColor = "rgba(255,255,255,0.05)";
                        card.style.background = "transparent";
                    }
                }
            }
        }
    }
    
    charts.mForecastOverall = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                data: forecastData,
                borderColor: '#10b981',
                borderDash: [3, 3],
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                fill: true,
                tension: 0.2,
                borderWidth: 1.5,
                pointRadius: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b', font: { size: 8 } } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b', font: { size: 8 } } }
            }
        }
    });
    
    // Expected stockouts table
    const tbody = document.getElementById("m-forecast-table-tbody");
    tbody.innerHTML = cachedMobileForecast.product_forecasts.map(pf => {
        const stockout = pf.expected_stockout_days;
        let stockoutText = "--";
        if (stockout < 0) {
            stockoutText = "Never";
        } else {
            stockoutText = `${stockout} days`;
        }
        
        return `
            <tr>
                <td><b>${pf.product_name}</b></td>
                <td>${pf.next_week_demand.toFixed(1)}</td>
                <td><span class="${stockout >= 0 && stockout <= 5 ? 'text-danger' : 'text-muted'}">${stockoutText}</span></td>
            </tr>
        `;
    }).join('');
}

// SUB-REPORT 6: CUSTOMERS
async function loadMobileCustomersReport() {
    try {
        const res = await fetch(`${API_BASE}/analytics/customers`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            
            destroyChart("mCustomersPatterns");
            const ctxPatterns = document.getElementById("m-chart-customers-patterns").getContext("2d");
            charts.mCustomersPatterns = new Chart(ctxPatterns, {
                type: 'bar',
                data: {
                    labels: data.purchase_patterns.map(p => p.day.substring(0,3)),
                    datasets: [{
                        data: data.purchase_patterns.map(p => p.revenue),
                        backgroundColor: '#3b82f6',
                        borderRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 } } },
                        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b', font: { size: 8 } } }
                    }
                }
            });
            
            // Co-purchase table
            const affinityTbody = document.getElementById("m-customer-affinity-tbody");
            affinityTbody.innerHTML = data.affinity_analysis.slice(0, 5).map(a => {
                return `
                    <tr>
                        <td><b>${a.product_a}</b> + <b>${a.product_b}</b></td>
                        <td>${a.support_count} sales</td>
                    </tr>
                `;
            }).join('');
            
            // Loyalty Contribution
            const repeatTbody = document.getElementById("m-customer-repeat-tbody");
            repeatTbody.innerHTML = data.repeat_customers.slice(0, 5).map(c => {
                return `
                    <tr>
                        <td><b>${c.customer_name.split(' ')[0]}</b></td>
                        <td>${c.purchase_count} visits</td>
                        <td>₹${c.total_spent.toLocaleString()}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

// Fallback anonymous data loading (no-op since mobile guards check currentToken)
function loadAnonymousDemoBI() {
    // Left empty since mobile layout guards views when logged out
}
