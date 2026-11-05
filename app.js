// static/app.js

// Dynamic API_BASE and Demo Mode Support for GitHub Pages & Cloud Deployments
let savedApiBase = localStorage.getItem("demandsense_api_base");
let API_BASE = savedApiBase || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8000/api"
        : (window.location.protocol.startsWith("http") && !window.location.hostname.includes("github.io")
            ? `${window.location.origin}/api`
            : "http://127.0.0.1:8000/api")
);

let isDemoMode = localStorage.getItem("demandsense_demo_mode") === "true";
if ((window.location.hostname.includes("github.io") || window.location.protocol === "file:") && !savedApiBase) {
    isDemoMode = true;
}

// In-Memory Mock Store for Standalone / GitHub Pages Demo
const demoStore = {
    user: {
        id: 1,
        full_name: "Sudharsana",
        email: "owner@demandsense.com",
        business: {
            id: 1,
            name: "DemandSense Supermarket",
            category: "Supermarket & Groceries",
            address: "100 Retail Boulevard, City Center",
            phone: "+1 (555) 019-2834"
        }
    },
    products: [
        { id: 1, name: "Premium Basmati Rice (5kg)", category: "Grains & Rice", purchase_price: 280, selling_price: 360, current_stock: 42, min_reorder_qty: 15 },
        { id: 2, name: "Cold-Pressed Sunflower Oil (1L)", category: "Oils", purchase_price: 130, selling_price: 185, current_stock: 28, min_reorder_qty: 10 },
        { id: 3, name: "Organic Whole Wheat Flour (10kg)", category: "Flour & Bakery", purchase_price: 320, selling_price: 410, current_stock: 19, min_reorder_qty: 12 },
        { id: 4, name: "Farm Fresh Honey (500g)", category: "Spreads & Sweeteners", purchase_price: 175, selling_price: 245, current_stock: 8, min_reorder_qty: 10 },
        { id: 5, name: "Artisan Dark Roast Coffee (250g)", category: "Beverages", purchase_price: 240, selling_price: 350, current_stock: 34, min_reorder_qty: 10 },
        { id: 6, name: "Swiss Dairy Chocolate (100g)", category: "Snacks & Confectionery", purchase_price: 85, selling_price: 120, current_stock: 55, min_reorder_qty: 20 },
        { id: 7, name: "Crunchy Almond Butter (350g)", category: "Spreads & Sweeteners", purchase_price: 310, selling_price: 420, current_stock: 6, min_reorder_qty: 8 },
        { id: 8, name: "Natural Greek Yogurt (400g)", category: "Dairy & Chilled", purchase_price: 70, selling_price: 98, current_stock: 14, min_reorder_qty: 10 }
    ],
    customers: [
        { id: 1, name: "Homer Simpson", phone: "+1 (555) 742-0199", email: "homer.simpson@springfield.org", segment: "Loyal" },
        { id: 2, name: "Marge Simpson", phone: "+1 (555) 742-0198", email: "marge.simpson@springfield.org", segment: "Loyal" },
        { id: 3, name: "Ned Flanders", phone: "+1 (555) 742-1354", email: "ned.flanders@leftorium.com", segment: "Regular" },
        { id: 4, name: "Moe Szyslak", phone: "+1 (555) 123-4567", email: "moe@tavernspringfield.com", segment: "Occasional" },
        { id: 5, name: "Apu Nahasapeemapetilon", phone: "+1 (555) 999-8888", email: "apu@quick-e-mart.com", segment: "Regular" }
    ],
    sales: [
        { id: 101, product_id: 1, product_name: "Premium Basmati Rice (5kg)", customer_id: 1, customer_name: "Homer Simpson", customer_email: "homer.simpson@springfield.org", quantity: 2, unit_price: 360, total_sales: 720, payment_method: "UPI", date: "2026-11-02", invoice_number: "INV-20261102-0101" },
        { id: 102, product_id: 2, product_name: "Cold-Pressed Sunflower Oil (1L)", customer_id: 2, customer_name: "Marge Simpson", customer_email: "marge.simpson@springfield.org", quantity: 3, unit_price: 185, total_sales: 555, payment_method: "Card", date: "2026-11-02", invoice_number: "INV-20261102-0102" },
        { id: 103, product_id: 5, product_name: "Artisan Dark Roast Coffee (250g)", customer_id: 3, customer_name: "Ned Flanders", customer_email: "ned.flanders@leftorium.com", quantity: 1, unit_price: 350, total_sales: 350, payment_method: "Cash", date: "2026-11-01", invoice_number: "INV-20261101-0103" }
    ],
    notifications: [
        { id: 1, message: "Farm Fresh Honey stock level is low (8 units left). Reorder recommended.", type: "low_stock", is_read: false, date: "2026-11-02" },
        { id: 2, message: "Crunchy Almond Butter stock level is low (6 units left). Reorder recommended.", type: "low_stock", is_read: false, date: "2026-11-02" },
        { id: 3, message: "Basmati Rice demand is projected to spike +32% next week.", type: "high_demand", is_read: true, date: "2026-11-01" }
    ]
};

// Global Fetch Interceptor for seamless GitHub Pages demo execution
const _originalFetch = window.fetch;
window.fetch = async function(resource, init) {
    const urlStr = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
    const isApiCall = urlStr.startsWith(API_BASE) || urlStr.includes("/api/") || urlStr.startsWith("/api");

    if (isDemoMode && isApiCall) {
        return mockApiResponse(urlStr, init);
    }
    try {
        const resp = await _originalFetch(resource, init);
        return resp;
    } catch (netErr) {
        if (isApiCall) {
            console.warn("[DEMO FALLBACK] Live backend unreachable at " + urlStr + ". Activating Demo Mode.", netErr);
            isDemoMode = true;
            localStorage.setItem("demandsense_demo_mode", "true");
            return mockApiResponse(urlStr, init);
        }
        throw netErr;
    }
};

function createJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: { "Content-Type": "application/json" }
    });
}

function mockApiResponse(urlStr, init = {}) {
    const method = (init.method || "GET").toUpperCase();
    let path = urlStr;
    if (path.includes(API_BASE)) {
        path = path.replace(API_BASE, "");
    } else if (path.includes("/api")) {
        path = path.substring(path.indexOf("/api") + 4);
    }
    path = path.split("?")[0];
    if (!path.startsWith("/")) path = "/" + path;
    
    // Auth routes
    if (path === "/auth/login") {
        return createJsonResponse({ access_token: "demo_token_pages", token_type: "bearer" });
    }
    if (path === "/auth/register") {
        return createJsonResponse({ message: "Registered demo user" });
    }
    if (path === "/auth/profile") {
        return createJsonResponse(demoStore.user);
    }
    if (path === "/auth/business") {
        return createJsonResponse(demoStore.user.business);
    }

    // Analytics routes
    if (path === "/analytics/summary") {
        return createJsonResponse({
            total_revenue: 148290.00,
            total_profit: 41850.00,
            total_sales: 384,
            inventory_value: 52400.00,
            business_health_score: 87.5
        });
    }
    if (path === "/analytics/sales") {
        const daily_sales = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            daily_sales.push({
                date: d.toISOString().split("T")[0],
                sales: Math.floor(4200 + Math.sin(i) * 1100 + (14 - i) * 150),
                quantity: Math.floor(16 + Math.sin(i) * 5 + (14 - i))
            });
        }
        // Build weekly aggregates (group by week)
        const weekMap = {};
        daily_sales.forEach(d => {
            const dt = new Date(d.date);
            const day = dt.getDay();
            const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(dt.setDate(diff));
            const key = mon.toISOString().split('T')[0];
            if (!weekMap[key]) weekMap[key] = { week: key, sales: 0, quantity: 0 };
            weekMap[key].sales += d.sales;
            weekMap[key].quantity += d.quantity;
        });
        const weekly_sales = Object.values(weekMap);
        // Build monthly aggregates
        const monthMap = {};
        daily_sales.forEach(d => {
            const dt = new Date(d.date);
            const key = dt.toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!monthMap[key]) monthMap[key] = { month: key, sales: 0, quantity: 0 };
            monthMap[key].sales += d.sales;
            monthMap[key].quantity += d.quantity;
        });
        const monthly_sales = Object.values(monthMap);
        const total_revenue = daily_sales.reduce((sum, d) => sum + d.sales, 0);
        return createJsonResponse({
            total_revenue: Math.round(total_revenue),
            revenue_growth_pct: 18.2,
            daily_sales,
            weekly_sales,
            monthly_sales
        });
    }
    if (path === "/analytics/products") {
        return createJsonResponse(demoStore.products.map(p => {
            const cost = p.purchase_price || p.cost_price || 0;
            return {
                product_id: p.id,
                product_name: p.name,
                category: p.category,
                total_sales: (p.selling_price * (p.id * 12 + 10)),
                units_sold: (p.id * 12 + 10),
                profit: ((p.selling_price - cost) * (p.id * 12 + 10)),
                velocity: p.id % 2 === 0 ? "Fast" : "Moderate",
                margin_pct: Math.round(((p.selling_price - cost) / (p.selling_price || 1)) * 100)
            };
        }));
    }
    if (path === "/analytics/forecast") {
        const points = [];
        for (let i = 1; i <= 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const predicted = Math.floor(25 + i * 0.8 + Math.sin(i) * 4);
            points.push({
                date: d.toISOString().split("T")[0],
                predicted_units: predicted,
                predicted_sales: predicted * 185,
                lower_bound: Math.max(5, predicted - 6),
                upper_bound: predicted + 7
            });
        }
        return createJsonResponse(points);
    }
    if (path === "/analytics/customers") {
        return createJsonResponse(demoStore.customers.map((c, idx) => ({
            customer_id: c.id,
            name: c.name,
            email: c.email,
            segment: c.segment,
            total_spent: 1200 + idx * 850,
            orders_count: 3 + idx * 2
        })));
    }

    // Products CRUD
    if (path === "/products") {
        if (method === "GET") return createJsonResponse(demoStore.products);
        if (method === "POST") {
            const body = JSON.parse(init.body || "{}");
            const newProd = { id: demoStore.products.length + 1, ...body, current_stock: parseInt(body.current_stock || 0) };
            demoStore.products.unshift(newProd);
            return createJsonResponse(newProd);
        }
    }
    if (path.startsWith("/products/")) {
        const id = parseInt(path.split("/")[2]);
        if (method === "DELETE") {
            demoStore.products = demoStore.products.filter(p => p.id !== id);
            return createJsonResponse({ message: "Product deleted" });
        }
        if (method === "PUT") {
            const body = JSON.parse(init.body || "{}");
            const idx = demoStore.products.findIndex(p => p.id === id);
            if (idx >= 0) demoStore.products[idx] = { ...demoStore.products[idx], ...body };
            return createJsonResponse(demoStore.products[idx]);
        }
    }

    // Customers
    if (path === "/customers") {
        if (method === "GET") return createJsonResponse(demoStore.customers);
        if (method === "POST") {
            const body = JSON.parse(init.body || "{}");
            const newCust = { id: demoStore.customers.length + 1, ...body };
            demoStore.customers.push(newCust);
            return createJsonResponse(newCust);
        }
    }

    // Sales transactions
    if (path === "/sales") {
        if (method === "GET") return createJsonResponse(demoStore.sales);
        if (method === "POST") {
            const body = JSON.parse(init.body || "{}");
            const prod = demoStore.products.find(p => p.id === parseInt(body.product_id));
            const cust = demoStore.customers.find(c => c.id === parseInt(body.customer_id));
            const qty = parseInt(body.quantity || 1);
            const price = parseFloat(body.unit_price || (prod ? prod.selling_price : 100));
            const invNum = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${demoStore.sales.length + 101}`;
            
            if (prod) {
                prod.current_stock = Math.max(0, prod.current_stock - qty);
            }
            const newSale = {
                id: demoStore.sales.length + 101,
                product_id: body.product_id,
                product_name: prod ? prod.name : "Product Item",
                customer_id: body.customer_id || null,
                customer_name: cust ? cust.name : (body.customer_name || "Walk-in Customer"),
                customer_email: body.customer_email || (cust ? cust.email : "guest@store.com"),
                customer_phone: cust ? cust.phone : "",
                quantity: qty,
                unit_price: price,
                total_sales: qty * price,
                payment_method: body.payment_method || "Cash",
                date: new Date().toISOString().split("T")[0],
                invoice_number: invNum,
                email_sent: Boolean(body.customer_email || (cust && cust.email)),
                email_status: "dispatched"
            };
            demoStore.sales.unshift(newSale);
            return createJsonResponse(newSale);
        }
    }

    // Sale invoice email
    if (path.match(/\/sales\/\d+\/email/)) {
        const body = JSON.parse(init.body || "{}");
        const recipient = body.email || "customer@example.com";
        return createJsonResponse({
            success: true,
            mode: "dispatched",
            recipient: recipient,
            invoice_number: "INV-DEMO-" + Math.floor(1000 + Math.random() * 9000),
            subject: "Invoice from DemandSense Supermarket",
            message: `Invoice dispatched to concern email ID: ${recipient}`
        });
    }

    // Notifications
    if (path === "/notifications") {
        if (urlStr.includes("unread_only=true")) {
            return createJsonResponse(demoStore.notifications.filter(n => !n.is_read));
        }
        return createJsonResponse(demoStore.notifications);
    }
    if (path.match(/\/notifications\/\d+\/read/)) {
        const id = parseInt(path.split("/")[2]);
        const n = demoStore.notifications.find(x => x.id === id);
        if (n) n.is_read = true;
        return createJsonResponse({ message: "Marked as read" });
    }

    // Reseed
    if (path === "/reports/seed") {
        return createJsonResponse({ message: "Demo database restored to default!" });
    }

    // Default 200 OK fallback
    return createJsonResponse({ message: "OK (Demo Mode)", path });
}

let currentToken = localStorage.getItem("demandsense_token") || "";
let currentUser = null;
let charts = {}; // holds Chart.js instances
let cachedCustomers = [];
let currentInvoiceSale = null;

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventHandlers();
});

// Clock removed for desktop layout (no phone status bar)

// Initialize application state
function initApp() {
    lucide.createIcons();
    if (window.Chart) {
        Chart.defaults.color = "#94a3b8";
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.borderColor = "rgba(255, 255, 255, 0.06)";
        if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
            Chart.defaults.plugins.tooltip.backgroundColor = "rgba(13, 20, 36, 0.95)";
            Chart.defaults.plugins.tooltip.borderColor = "rgba(255, 255, 255, 0.12)";
            Chart.defaults.plugins.tooltip.borderWidth = 1;
            Chart.defaults.plugins.tooltip.padding = 10;
            Chart.defaults.plugins.tooltip.cornerRadius = 8;
            Chart.defaults.plugins.tooltip.titleFont = { family: "'Outfit', sans-serif", weight: '600' };
            Chart.defaults.plugins.tooltip.bodyFont = { family: "'Inter', sans-serif" };
        }
    }
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
    document.getElementById("mobile-logout-btn").addEventListener("click", handleLogout);
    
    // 4. Phone Navigation clicks
    document.querySelectorAll(".phone-nav-item").forEach(item => {
        item.addEventListener("click", function() {
            const view = this.getAttribute("data-view");
            if (view) switchPhoneView(view);
        });
    });

    // Hash change routing for bookmarking and subagent navigation
    window.addEventListener("hashchange", () => {
        const route = window.location.hash.replace("#", "");
        if (route && ["home", "products", "record-sale", "analytics", "alerts"].includes(route)) {
            switchPhoneView(route);
        }
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
    
    // 8. Recording Sales Form Stepper & Customer
    document.getElementById("sale-qty-minus").addEventListener("click", () => adjustSaleQty(-1));
    document.getElementById("sale-qty-plus").addEventListener("click", () => adjustSaleQty(1));
    document.getElementById("sale-product-select").addEventListener("change", handleSaleProductChange);
    document.getElementById("sale-customer-select").addEventListener("change", handleSaleCustomerChange);
    document.getElementById("sale-quantity").addEventListener("input", updateSaleInvoiceTotal);
    document.getElementById("sale-price-override").addEventListener("input", updateSaleInvoiceTotal);
    document.getElementById("record-sale-form").addEventListener("submit", handleRecordSale);

    // 8b. Invoice Dialog Modal Handlers
    const modalCloseBtn = document.getElementById("invoice-modal-close-btn");
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeInvoiceModal);
    const modalDoneBtn = document.getElementById("inv-modal-done-btn");
    if (modalDoneBtn) modalDoneBtn.addEventListener("click", closeInvoiceModal);
    const modalResendBtn = document.getElementById("inv-modal-resend-btn");
    if (modalResendBtn) modalResendBtn.addEventListener("click", handleResendInvoiceEmail);
    const modalPdfBtn = document.getElementById("inv-modal-pdf-btn");
    if (modalPdfBtn) modalPdfBtn.addEventListener("click", () => {
        if (currentInvoiceSale) downloadSaleInvoicePdf(currentInvoiceSale.id, currentInvoiceSale.invoice_number);
    });
    const modalMailtoBtn = document.getElementById("inv-modal-mailto-btn");
    if (modalMailtoBtn) modalMailtoBtn.addEventListener("click", () => {
        if (currentInvoiceSale) openSaleInvoiceMailto(currentInvoiceSale);
    });
    const modalWaBtn = document.getElementById("inv-modal-wa-btn");
    if (modalWaBtn) modalWaBtn.addEventListener("click", () => {
        if (currentInvoiceSale) openSaleInvoiceWhatsApp(currentInvoiceSale);
    });
    const modalHtmlBtn = document.getElementById("inv-modal-html-btn");
    if (modalHtmlBtn) modalHtmlBtn.addEventListener("click", () => {
        if (currentInvoiceSale) openSaleInvoiceHtml(currentInvoiceSale.id);
    });

    // 9. Mobile Analytics Report Tabs
    document.querySelectorAll(".bi-tab-btn").forEach(btn => {
        btn.addEventListener("click", handleMobileReportTabClick);
    });
    document.getElementById("m-forecast-product-select").addEventListener("change", renderMobileForecastGraphsAndTables);

    // 10. Demo & API Config handlers for GitHub Pages
    const quickDemoBtn = document.getElementById("quick-demo-login-btn");
    if (quickDemoBtn) quickDemoBtn.addEventListener("click", enterDemoMode);
    const configApiBtn = document.getElementById("config-api-btn");
    if (configApiBtn) configApiBtn.addEventListener("click", configureApiUrl);
    const phoneConfigApiBtn = document.getElementById("phone-config-api-btn");
    if (phoneConfigApiBtn) phoneConfigApiBtn.addEventListener("click", configureApiUrl);
}

function enterDemoMode() {
    isDemoMode = true;
    currentToken = "demo_token_pages";
    localStorage.setItem("demandsense_token", currentToken);
    localStorage.setItem("demandsense_demo_mode", "true");
    currentUser = demoStore.user;
    updateUserProfileUI(currentUser);
    showDashboard();
    switchPhoneView("home");
    reloadAllBIDashboards();
}

function configureApiUrl() {
    const current = localStorage.getItem("demandsense_api_base") || API_BASE;
    const input = prompt(
        "Enter your live Backend API URL (or leave blank to use Demo Mode on GitHub Pages):\nExample: https://sales-data-dashboard.onrender.com/api",
        current
    );
    if (input === null) return;
    const cleaned = input.trim().replace(/\/+$/, "");
    if (!cleaned) {
        localStorage.removeItem("demandsense_api_base");
        localStorage.setItem("demandsense_demo_mode", "true");
        isDemoMode = true;
        alert("Switched to Standalone Interactive Demo Mode.");
    } else {
        localStorage.setItem("demandsense_api_base", cleaned);
        localStorage.removeItem("demandsense_demo_mode");
        API_BASE = cleaned;
        isDemoMode = false;
        alert(`API URL set to: ${cleaned}\nThe app will now connect to this backend.`);
    }
    window.location.reload();
}

function updateUserProfileUI(user) {
    if (!user) return;
    const ownerEl = document.getElementById("phone-owner-name");
    const bizNameEl = document.getElementById("phone-biz-name");
    const bizCatEl = document.getElementById("phone-biz-cat");
    const bizAddrEl = document.getElementById("phone-biz-addr");
    if (ownerEl) ownerEl.innerText = user.full_name;
    if (bizNameEl) bizNameEl.innerText = user.business ? user.business.name : "DemandSense Store";
    if (bizCatEl) bizCatEl.innerText = user.business ? user.business.category : "Retail";
    if (bizAddrEl) bizAddrEl.innerHTML = `<i data-lucide="map-pin"></i> ${user.business && user.business.address ? user.business.address : "Store Location"}`;
    const initials = user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : "DS";
    const av = document.getElementById("top-avatar");
    if (av) av.innerText = initials;
    if (window.lucide) lucide.createIcons();
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
            updateUserProfileUI(currentUser);
            showDashboard();
            const initHash = window.location.hash.replace("#", "");
            if (initHash && ["home", "products", "record-sale", "analytics", "alerts"].includes(initHash)) {
                switchPhoneView(initHash);
            } else {
                switchPhoneView("home");
            }
            reloadAllBIDashboards();
        } else {
            handleLogout();
        }
    } catch (err) {
        console.error("Connection failed", err);
        if (window.location.hostname.includes("github.io") || isDemoMode) {
            enterDemoMode();
        } else {
            showLoginOverlay();
        }
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
            const err = await response.json().catch(() => ({}));
            alert(`Login Failed: ${err.detail || "Invalid credentials"}`);
        }
    } catch (err) {
        console.warn("Backend API connection failed, launching demo mode fallback", err);
        enterDemoMode();
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
        alert("Please register or log in to download records.");
        return;
    }
    if (isDemoMode) {
        // Export CSV directly in browser for standalone demo mode
        const headers = ["ID", "Date", "Invoice No", "Product", "Customer", "Quantity", "Unit Price", "Total Sales", "Payment Method"];
        const rows = demoStore.sales.map(s => [
            s.id,
            s.date,
            s.invoice_number,
            `"${s.product_name}"`,
            `"${s.customer_name}"`,
            s.quantity,
            s.unit_price,
            s.total_sales,
            s.payment_method
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `demandsense_sales_report_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        // Load recent invoices list on home view
        await loadRecentInvoices();
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
            cachedCustomers = custs;
            custSelect.innerHTML = `<option value="">Walk-in Customer (Manual Email)</option>` + 
                custs.map(c => `<option value="${c.id}">${c.name} (${c.segment})${c.email ? ' • ' + c.email : ''}</option>`).join('');
        }
        
        document.getElementById("sale-quantity").value = 1;
        document.getElementById("sale-price-override").value = "";
        document.getElementById("sale-total-val").innerText = "₹0.00";
        document.getElementById("sale-stock-hint").innerText = "Available: --";
        
        const emailInput = document.getElementById("sale-customer-email");
        if (emailInput) {
            emailInput.value = "";
            emailInput.placeholder = "e.g. customer@example.com (Concern Mail ID)";
        }
        const emailCheckbox = document.getElementById("sale-send-email-checkbox");
        if (emailCheckbox) emailCheckbox.checked = true;
        
    } catch (e) {
        console.error("Form load failed", e);
    }
}

function handleSaleCustomerChange() {
    const select = document.getElementById("sale-customer-select");
    const custId = select.value;
    const emailInput = document.getElementById("sale-customer-email");
    const sendEmailCheckbox = document.getElementById("sale-send-email-checkbox");
    
    if (!emailInput) return;
    
    if (!custId) {
        // Walk-in customer
        emailInput.value = "";
        emailInput.placeholder = "customer@example.com (Concern Mail ID)";
        return;
    }
    
    const cust = cachedCustomers.find(c => c.id == custId);
    if (cust && cust.email) {
        emailInput.value = cust.email;
        if (sendEmailCheckbox) sendEmailCheckbox.checked = true;
    } else {
        emailInput.value = "";
        emailInput.placeholder = `Enter email for ${cust ? cust.name : 'customer'}...`;
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
    const emailInput = document.getElementById("sale-customer-email");
    const customerEmail = emailInput ? emailInput.value.trim() : "";
    const emailCheckbox = document.getElementById("sale-send-email-checkbox");
    const sendEmail = emailCheckbox ? emailCheckbox.checked : true;
    const payMode = document.getElementById("sale-payment-method").value;
    
    if (!pId) {
        alert("Please select a product.");
        return;
    }
    
    const submitBtn = e.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Recording Sale & Generating Invoice...";
    }
    
    const payload = {
        product_id: parseInt(pId),
        quantity: qty,
        unit_price: price,
        customer_id: cId ? parseInt(cId) : null,
        customer_email: customerEmail || null,
        send_email: sendEmail,
        payment_method: payMode
    };
    
    try {
        const res = await fetch(`${API_BASE}/sales`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            const saleData = await res.json();
            
            // Present rich invoice modal showing receipt delivery to concern mail id
            showInvoiceModal(saleData);
            
            // Refresh dashboard data & recent invoices
            fetchMobileSummary();
            reloadAllBIDashboards();
        } else {
            const err = await res.json();
            alert(`Transaction failed: ${err.detail || "Unknown error"}`);
        }
    } catch (e) {
        console.error("Sale recording failed", e);
        alert("API request failed. Please check network connection.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Complete Transaction";
        }
    }
}

// Invoice Dialog & Delivery Functions
function showInvoiceModal(saleData) {
    currentInvoiceSale = saleData;
    const overlay = document.getElementById("invoice-modal-overlay");
    if (!overlay) return;
    
    const invNum = saleData.invoice_number || `INV-${saleData.id}`;
    document.getElementById("inv-modal-subtitle").innerText = `Invoice #${invNum}`;
    
    const emailTag = document.getElementById("inv-modal-email-tag");
    const emailTarget = document.getElementById("inv-modal-email-target");
    const emailDesc = document.getElementById("inv-modal-email-desc");
    const resendInput = document.getElementById("inv-modal-resend-input");
    
    const targetEmail = saleData.customer_email;
    if (targetEmail) {
        emailTag.innerText = saleData.email_sent ? "Invoice Delivered ✓" : "Concern Mail Configured";
        emailTag.style.color = "#34d399";
        emailTarget.innerText = targetEmail;
        emailDesc.innerText = saleData.email_status || `Invoice sent to concern mail ID ${targetEmail} with PDF attachment.`;
        if (resendInput) resendInput.value = targetEmail;
    } else {
        emailTag.innerText = "No Email Provided";
        emailTag.style.color = "#f59e0b";
        emailTarget.innerText = "Enter mail ID to deliver invoice";
        emailDesc.innerText = "You can enter the concern mail ID below and click Send.";
        if (resendInput) resendInput.value = "";
    }
    
    document.getElementById("inv-modal-cust-name").innerText = saleData.customer_name || "Walk-in Customer";
    document.getElementById("inv-modal-item-name").innerText = `${saleData.product_name} (x${saleData.quantity})`;
    document.getElementById("inv-modal-pay-mode").innerText = saleData.payment_method;
    document.getElementById("inv-modal-total").innerText = `₹${saleData.total_sales.toFixed(2)}`;
    
    overlay.classList.remove("hidden");
    lucide.createIcons();
}

function closeInvoiceModal() {
    const overlay = document.getElementById("invoice-modal-overlay");
    if (overlay) overlay.classList.add("hidden");
    switchPhoneView("home");
}

async function handleResendInvoiceEmail() {
    if (!currentInvoiceSale) return;
    const input = document.getElementById("inv-modal-resend-input");
    const email = input ? input.value.trim() : "";
    if (!email || !email.includes("@")) {
        alert("Please enter a valid concern email address.");
        return;
    }
    
    const btn = document.getElementById("inv-modal-resend-btn");
    btn.disabled = true;
    btn.innerText = "Sending...";
    
    try {
        const res = await fetch(`${API_BASE}/sales/${currentInvoiceSale.id}/email`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ email: email })
        });
        
        if (res.ok) {
            const data = await res.json();
            currentInvoiceSale.customer_email = email;
            currentInvoiceSale.email_sent = true;
            
            const emailTag = document.getElementById("inv-modal-email-tag");
            emailTag.innerText = "Invoice Delivered ✓";
            emailTag.style.color = "#34d399";
            document.getElementById("inv-modal-email-target").innerText = email;
            document.getElementById("inv-modal-email-desc").innerText = `Invoice successfully sent to ${email} with attached PDF.`;
            alert(`Invoice successfully sent to concern mail ID: ${email}!`);
            loadRecentInvoices();
        } else {
            const err = await res.json();
            alert(`Failed to send email: ${err.detail || "Server error"}`);
        }
    } catch (err) {
        console.error(err);
        alert("Network request failed while sending invoice email.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="mail"></i> Send`;
        lucide.createIcons();
    }
}

function downloadSaleInvoicePdf(saleId, invoiceNum) {
    if (isDemoMode) {
        openSaleInvoiceHtml(saleId);
        return;
    }
    const token = currentToken;
    const url = `${API_BASE}/sales/${saleId}/invoice-pdf`;
    fetch(url, { headers: { "Authorization": `Bearer ${token}` } })
        .then(resp => {
            if (!resp.ok) throw new Error("Could not download invoice PDF");
            return resp.blob();
        })
        .then(blob => {
            const link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = `${invoiceNum || 'Invoice'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch(err => alert(err.message));
}

function openSaleInvoiceMailto(saleData) {
    const bizName = document.getElementById("phone-biz-name") ? document.getElementById("phone-biz-name").innerText : "DemandSense Store";
    const email = saleData.customer_email || "";
    const invNum = saleData.invoice_number || `INV-${saleData.id}`;
    const subject = `Invoice #${invNum} from ${bizName}`;
    const body = `Dear ${saleData.customer_name || 'Customer'},\n\nThank you for shopping at ${bizName}.\n\n--- TRANSACTION INVOICE ---\nInvoice: #${invNum}\nDate: ${saleData.date}\nProduct: ${saleData.product_name}\nQuantity: ${saleData.quantity}\nUnit Price: ₹${saleData.unit_price.toFixed(2)}\nTotal Amount Paid: ₹${saleData.total_sales.toFixed(2)}\nPayment Method: ${saleData.payment_method}\nStatus: PAID IN FULL\n\nThank you for your business!\n\nBest regards,\n${bizName}`;
    
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openSaleInvoiceWhatsApp(saleData) {
    const bizName = document.getElementById("phone-biz-name") ? document.getElementById("phone-biz-name").innerText : "DemandSense Store";
    const invNum = saleData.invoice_number || `INV-${saleData.id}`;
    const phone = saleData.customer_phone ? saleData.customer_phone.replace(/\D/g, '') : '';
    const text = `*Invoice #${invNum} from ${bizName}*\n\nHi ${saleData.customer_name || 'Customer'},\nHere is your purchase bill:\n\n*Product*: ${saleData.product_name}\n*Quantity*: ${saleData.quantity}\n*Price*: ₹${saleData.unit_price.toFixed(2)}\n*Total*: ₹${saleData.total_sales.toFixed(2)}\n*Payment Method*: ${saleData.payment_method}\n*Date*: ${saleData.date}\n\nThank you for shopping with us!`;
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function openSaleInvoiceHtml(saleId) {
    if (isDemoMode) {
        const sale = demoStore.sales.find(s => s.id === saleId) || demoStore.sales[0] || {
            invoice_number: "INV-" + saleId,
            date: new Date().toISOString().split("T")[0],
            customer_name: "Valued Customer",
            customer_email: "guest@store.com",
            product_name: "Inventory Item",
            quantity: 1,
            unit_price: 150,
            total_sales: 150,
            payment_method: "Cash"
        };
        const biz = (demoStore.user && demoStore.user.business) ? demoStore.user.business : {
            name: "DemandSense Supermarket",
            category: "Supermarket & Groceries",
            address: "100 Retail Boulevard, City Center",
            phone: "+1 (555) 019-2834"
        };
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice #${sale.invoice_number || saleId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
            .invoice-card { max-width: 620px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .biz-name { font-size: 22px; font-weight: 800; color: #0284c7; }
            .biz-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
            .badge-paid { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-top: 6px; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { margin: 0; font-size: 20px; color: #0f172a; }
            .invoice-title p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
            .client-section { margin-top: 24px; font-size: 14px; line-height: 1.6; }
            .client-section strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
            th { background: #f8fafc; text-align: left; padding: 12px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 14px; border-bottom: 1px solid #f1f5f9; }
            .total-row { font-size: 16px; font-weight: 800; }
            .actions-bar { margin-top: 30px; display: flex; gap: 12px; justify-content: flex-end; }
            .btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; }
            .btn-print { background: #0284c7; color: #ffffff; }
            .btn-close { background: #e2e8f0; color: #334155; }
            @media print { .actions-bar { display: none; } body { padding: 0; background: #fff; } .invoice-card { box-shadow: none; border: none; } }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="top-bar">
              <div>
                <div class="biz-name">${biz.name}</div>
                <div class="biz-sub">${biz.category}</div>
                <div class="biz-sub">${biz.address} | ${biz.phone}</div>
                <span class="badge-paid">✓ PAID IN FULL</span>
              </div>
              <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>#${sale.invoice_number || 'INV-' + saleId}</p>
                <p>Date: ${sale.date}</p>
              </div>
            </div>
            <div class="client-section">
              <strong>Billed To:</strong><br>
              ${sale.customer_name}<br>
              <span style="color:#64748b;">${sale.customer_email || 'Walk-in Customer'}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${sale.product_name}</strong></td>
                  <td>${sale.quantity}</td>
                  <td>₹${Number(sale.unit_price).toFixed(2)}</td>
                  <td style="text-align:right;">₹${Number(sale.total_sales).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="text-align:right; border-top: 2px solid #cbd5e1;">Grand Total:</td>
                  <td style="text-align:right; color:#0284c7; border-top: 2px solid #cbd5e1;">₹${Number(sale.total_sales).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top:20px; font-size:13px; color:#64748b;">
              Payment Method: <strong>${sale.payment_method}</strong>
            </div>
            <div class="actions-bar">
              <button class="btn btn-close" onclick="window.close()">Close</button>
              <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
            </div>
          </div>
        </body>
        </html>`;
        const invoiceWin = window.open("", "_blank");
        if (invoiceWin) {
            invoiceWin.document.write(html);
            invoiceWin.document.close();
            return;
        }
    }
    window.open(`${API_BASE}/sales/${saleId}/invoice-html`, '_blank');
}

async function loadRecentInvoices() {
    const list = document.getElementById("phone-recent-invoices-list");
    if (!list) return;
    try {
        const res = await fetch(`${API_BASE}/sales`, { headers: getHeaders() });
        if (res.ok) {
            const sales = await res.json();
            const recent = sales.slice(0, 6);
            if (recent.length === 0) {
                list.innerHTML = `<p style="font-size:12px; color:var(--text-sec); text-align:center; padding:10px;">No sales recorded yet.</p>`;
                return;
            }
            list.innerHTML = recent.map(s => {
                const hasEmail = s.customer_email;
                const invRef = s.invoice_number || `#INV-${s.id}`;
                return `
                    <div class="recent-invoice-card">
                        <div class="recent-inv-left">
                            <div class="recent-inv-icon">
                                <i data-lucide="receipt"></i>
                            </div>
                            <div class="recent-inv-meta">
                                <div class="recent-inv-title">${s.product_name} <span style="font-size:11px; color:var(--text-sec); font-weight:normal;">x${s.quantity}</span></div>
                                <div class="recent-inv-sub">
                                    <span>${s.customer_name || 'Walk-in'}</span>
                                    ${hasEmail ? `<span class="email-tag-chip" title="${s.customer_email}">✉ ${s.customer_email}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="recent-inv-right">
                            <div class="recent-inv-amount">₹${s.total_sales.toFixed(2)}</div>
                            <button type="button" class="recent-inv-action-btn" onclick="promptEmailSale(${s.id}, '${s.customer_email || ''}')">
                                <i data-lucide="mail"></i> ${hasEmail ? 'Resend' : 'Send'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            lucide.createIcons();
        }
    } catch (err) {
        console.error("Failed to load recent invoices", err);
    }
}

async function promptEmailSale(saleId, currentEmail) {
    const targetEmail = prompt("Enter concern mail ID to send this invoice to:", currentEmail || "");
    if (!targetEmail) return;
    if (!targetEmail.includes("@")) {
        alert("Please enter a valid email address.");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/sales/${saleId}/email`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ email: targetEmail.trim() })
        });
        if (res.ok) {
            alert(`Invoice successfully sent to concern mail ID: ${targetEmail.trim()}!`);
            loadRecentInvoices();
        } else {
            const err = await res.json();
            alert(`Failed to send invoice: ${err.detail || "Server error"}`);
        }
    } catch (e) {
        alert("Network request failed while sending email.");
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
            const activeTab = document.querySelector(".bi-tab-btn.active");
            if (activeTab && activeTab.getAttribute("data-tab") === "executive") fetchSummaryMetrics();
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
        const activeTab = document.querySelector(".bi-tab-btn.active");
        const reportVal = activeTab ? activeTab.getAttribute("data-tab") : "executive";
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
    const activeTab = document.querySelector(".bi-tab-btn.active");
    const val = activeTab ? activeTab.getAttribute("data-tab") : "executive";
    
    // Hide all report sections
    document.querySelectorAll(".mobile-report-section").forEach(sec => sec.classList.remove("active"));
    
    // Show selected section
    const targetSec = document.getElementById(`m-report-${val}`);
    if (targetSec) {
        targetSec.classList.add("active");
    }
    
    await loadMobileAnalyticsReport(val);
}

// Handler for mobile report tab click
async function handleMobileReportTabClick(e) {
    document.querySelectorAll(".bi-tab-btn").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
    const val = e.target.getAttribute("data-tab");
    
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
