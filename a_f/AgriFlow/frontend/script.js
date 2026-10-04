// ============================================================
// AgriFlow - shared JavaScript for all pages
// ============================================================

const API_URL = "http://127.0.0.1:8000";

// The browser only remembers WHO is logged in (a login token).
// All crops, orders and accounts live in the SQLite database.
const TOKEN_KEY = "agriflow_token";
const USER_KEY = "agriflow_user";

const ROLE_INFO = {
  farmer: { icon: "👨‍🌾", label: "Farmer", home: "farmer.html" },
  vendor: { icon: "🏪", label: "Vendor", home: "vendor.html" },
  buyer: { icon: "🛒", label: "Buyer", home: "buyer.html" },
};
const STATUSES = ["Pending", "Confirmed", "Delivered"];

// ---------- Session (login) helpers ----------
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch (e) {
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

// ---------- Talking to the backend ----------
async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  let response;
  try {
    response = await fetch(API_URL + path, { ...options, headers });
  } catch (error) {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Expired or invalid login -> send the user to the login page
    if (response.status === 401 && token) {
      clearSession();
      window.location.href = "login.html";
      throw new Error("Please log in again.");
    }
    let message = "Something went wrong.";
    if (data && typeof data.detail === "string") {
      message = data.detail;
    } else if (data && Array.isArray(data.detail)) {
      message = data.detail.map((d) => d.msg).join(", ");
    }
    throw new Error(message);
  }
  return data;
}

// ---------- Small helpers ----------
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = "message " + type;
}

function formatMoney(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-IN");
}

function formatDate(isoString) {
  // The server stores UTC time without a "Z", so we add it
  const hasZone = /Z|[+-]\d\d:\d\d$/.test(isoString);
  return new Date(hasZone ? isoString : isoString + "Z").toLocaleString();
}

function toast(text, type = "success") {
  let box = document.getElementById("toastBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "toastBox";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

const CROP_EMOJI = {
  tomato: "🍅", potato: "🥔", onion: "🧅", carrot: "🥕", corn: "🌽", maize: "🌽",
  rice: "🌾", wheat: "🌾", paddy: "🌾", mango: "🥭", apple: "🍎", banana: "🍌",
  grape: "🍇", chilli: "🌶️", chili: "🌶️", pepper: "🫑", brinjal: "🍆", eggplant: "🍆",
  cabbage: "🥬", lettuce: "🥬", spinach: "🥬", garlic: "🧄", orange: "🍊", lemon: "🍋",
  watermelon: "🍉", coconut: "🥥", cucumber: "🥒", strawberry: "🍓", pineapple: "🍍",
  peach: "🍑", pear: "🍐", mushroom: "🍄", broccoli: "🥦", peanut: "🥜", pea: "🌱",
};

function cropEmoji(name) {
  const lower = String(name).toLowerCase();
  for (const key in CROP_EMOJI) {
    if (lower.includes(key)) return CROP_EMOJI[key];
  }
  return "🌱";
}

function statusBadge(status) {
  return `<span class="badge ${status.toLowerCase()}">${escapeHTML(status)}</span>`;
}

function roleBadge(role) {
  return `<span class="badge ${role}">${ROLE_INFO[role] ? ROLE_INFO[role].label : role}</span>`;
}

// ---------- Navbar (changes with login state) ----------
function renderNavbar() {
  const header = document.getElementById("navbar");
  if (!header) return;

  const page = document.body.dataset.page;
  const user = getUser();
  const loggedIn = !!getToken() && !!user;
  const link = (href, text, key) =>
    `<a href="${href}" class="${page === key ? "active" : ""}">${text}</a>`;

  let links = link("index.html", "Home", "home") + link("buyer.html", "Marketplace", "buyer");

  if (loggedIn) {
    if (user.role === "farmer") links += link("farmer.html", "Farmer Hub", "farmer");
    if (user.role === "vendor") links += link("vendor.html", "Vendor Hub", "vendor");
    links += link("dashboard.html", "Dashboard", "dashboard");
    const info = ROLE_INFO[user.role];
    links += `<span class="user-chip">${info.icon} ${escapeHTML(user.name)} · ${info.label}
              <button onclick="logout()">Logout</button></span>`;
  } else {
    links += link("login.html", "Login", "login");
    links += `<a href="register.html" class="nav-cta">Register</a>`;
  }

  header.innerHTML = `<a class="logo" href="index.html">🌾 AgriFlow</a><nav class="nav-links">${links}</nav>`;
}

// Makes sure the visitor is logged in (and has the right role) before showing a page
async function requireAuth(allowedRoles) {
  if (!getToken()) {
    window.location.href = "login.html";
    return null;
  }
  try {
    const me = await apiRequest("/me");
    localStorage.setItem(USER_KEY, JSON.stringify(me));
    renderNavbar();
    if (allowedRoles && !allowedRoles.includes(me.role)) {
      toast("This page is not for " + ROLE_INFO[me.role].label + " accounts.", "error");
      setTimeout(() => (window.location.href = ROLE_INFO[me.role].home), 1300);
      return null;
    }
    return me;
  } catch (error) {
    toast(error.message, "error");
    return null;
  }
}

// ---------- Tabs ----------
function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

// ============================================================
// SHARED PIECES: crop cards, tables, modals
// ============================================================
function cropCardHTML(c, buttonHTML) {
  const low = c.quantity <= 10 ? "stock-low" : "";
  return `
    <div class="crop-card">
      <div class="crop-top">${cropEmoji(c.crop_name)}</div>
      <div class="crop-body">
        <h3>${escapeHTML(c.crop_name)}</h3>
        <p>🌱 Grown by ${escapeHTML(c.origin_farmer)}</p>
        <p>🏪 Sold by ${escapeHTML(c.seller_name)} ${roleBadge(c.seller_role)}</p>
        <p>📦 <span class="${low}">${formatNumber(c.quantity)} kg</span> available</p>
        <div class="price">${formatMoney(c.price)} <small>/ kg</small></div>
        ${buttonHTML}
      </div>
    </div>`;
}

function ordersTableHTML(orders, perspective, withControls) {
  if (orders.length === 0) return '<p class="empty">No orders yet.</p>';

  const rows = orders
    .map((o) => {
      const other =
        perspective === "sales"
          ? `${escapeHTML(o.buyer_name)} ${roleBadge(o.buyer_role)}`
          : `${escapeHTML(o.seller_name)} ${roleBadge(o.seller_role)}`;

      let statusCell = statusBadge(o.status);
      if (withControls && o.status !== "Delivered") {
        const next = STATUSES.slice(STATUSES.indexOf(o.status) + 1)
          .map((s) => `<option value="${s}">${s}</option>`)
          .join("");
        statusCell += ` <select onchange="changeOrderStatus(${o.id}, this.value)">
                          <option value="">Update…</option>${next}</select>`;
      }

      return `
        <tr>
          <td>#${o.id}</td>
          <td>${cropEmoji(o.crop_name)} ${escapeHTML(o.crop_name)}</td>
          <td>${other}</td>
          <td>${formatNumber(o.quantity)} kg</td>
          <td>${formatMoney(o.total_price)}</td>
          <td>${statusCell}</td>
          <td>${formatDate(o.created_at)}</td>
        </tr>`;
    })
    .join("");

  const who = perspective === "sales" ? "Buyer" : "Seller";
  return `
    <table>
      <thead><tr><th>Order</th><th>Crop</th><th>${who}</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function myCropsTableHTML(crops) {
  if (crops.length === 0) return '<p class="empty">Nothing here yet.</p>';
  const rows = crops
    .map((c) => {
      const status =
        c.quantity > 0
          ? '<span class="badge ok">In stock</span>'
          : '<span class="badge out">Sold out</span>';
      return `
        <tr>
          <td>${cropEmoji(c.crop_name)} ${escapeHTML(c.crop_name)}</td>
          <td>${escapeHTML(c.origin_farmer)}</td>
          <td>${formatNumber(c.quantity)} kg</td>
          <td>${formatMoney(c.price)}/kg</td>
          <td>${status}</td>
          <td><button class="btn btn-small" onclick="openEditModal(${c.id})">✏️ Edit</button></td>
        </tr>`;
    })
    .join("");
  return `
    <table>
      <thead><tr><th>Crop</th><th>Grown by</th><th>Stock</th><th>Price</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// What happens after a seller changes an order's status (set by each page)
let afterStatusChange = () => {};

async function changeOrderStatus(orderId, status) {
  if (!status) return;
  try {
    await apiRequest(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    toast("Order #" + orderId + " marked " + status);
    afterStatusChange();
  } catch (error) {
    toast(error.message, "error");
  }
}

// ---------- Edit crop popup (farmer + vendor) ----------
let myCropsCache = [];
let afterCropEdit = () => {};

function openEditModal(cropId) {
  const crop = myCropsCache.find((c) => c.id === cropId);
  if (!crop) return;
  const user = getUser();

  document.getElementById("editCropId").value = crop.id;
  document.getElementById("editTitle").textContent = "Edit " + crop.crop_name;
  document.getElementById("editPrice").value = crop.price;
  const qty = document.getElementById("editQuantity");
  qty.value = crop.quantity;
  qty.disabled = user.role === "vendor"; // vendor stock only comes from wholesale buying
  document.getElementById("editQtyHelp").style.display = user.role === "vendor" ? "block" : "none";
  document.getElementById("editMessage").className = "message";
  document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
}

function setupEditModal() {
  const form = document.getElementById("editForm");
  const message = document.getElementById("editMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("editCropId").value;
    const body = { price: parseFloat(document.getElementById("editPrice").value) };
    if (!document.getElementById("editQuantity").disabled) {
      body.quantity = parseInt(document.getElementById("editQuantity").value, 10);
    }
    try {
      await apiRequest("/crops/" + id, { method: "PUT", body: JSON.stringify(body) });
      toast("Saved! ✅");
      closeEditModal();
      afterCropEdit();
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });

  document.getElementById("editModal").addEventListener("click", (event) => {
    if (event.target.id === "editModal") closeEditModal();
  });
}

// ---------- Buy popup (buyer page + vendor wholesale) ----------
let marketCrops = [];
let afterPurchase = () => {};

function openBuyModal(cropId) {
  const crop = marketCrops.find((c) => c.id === cropId);
  if (!crop) return;

  document.getElementById("orderCropId").value = crop.id;
  document.getElementById("modalTitle").textContent = cropEmoji(crop.crop_name) + " Buy " + crop.crop_name;
  document.getElementById("modalInfo").textContent =
    `${formatMoney(crop.price)}/kg • ${formatNumber(crop.quantity)} kg available • sold by ${crop.seller_name}`;

  const qty = document.getElementById("orderQuantity");
  qty.max = crop.quantity;
  qty.value = "";
  document.getElementById("orderTotal").textContent = "Total: ₹0.00";
  document.getElementById("orderMessage").className = "message";
  document.getElementById("buyModal").classList.add("open");
}

function closeBuyModal() {
  document.getElementById("buyModal").classList.remove("open");
}

function setupBuyModal() {
  const form = document.getElementById("orderForm");
  const message = document.getElementById("orderMessage");
  const qtyInput = document.getElementById("orderQuantity");

  // Live total while typing
  qtyInput.addEventListener("input", () => {
    const crop = marketCrops.find((c) => c.id === parseInt(document.getElementById("orderCropId").value, 10));
    const qty = parseInt(qtyInput.value, 10) || 0;
    document.getElementById("orderTotal").textContent = "Total: " + formatMoney(crop ? crop.price * qty : 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = {
      crop_id: parseInt(document.getElementById("orderCropId").value, 10),
      quantity: parseInt(qtyInput.value, 10),
    };
    try {
      const order = await apiRequest("/orders", { method: "POST", body: JSON.stringify(body) });
      toast(`Order placed! Total ${formatMoney(order.total_price)} ✅`);
      closeBuyModal();
      afterPurchase(); // refresh: stock goes down, sold-out crops disappear
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });

  document.getElementById("buyModal").addEventListener("click", (event) => {
    if (event.target.id === "buyModal") closeBuyModal();
  });
}

// Loads crops into a grid. buttonFor(crop) returns the button HTML for each card.
async function loadCropGrid(gridId, { sellerRole = "", search = "" }, buttonFor) {
  const grid = document.getElementById(gridId);
  try {
    // available_only=true -> sold-out crops are hidden from buyers
    let url = "/crops?available_only=true";
    if (sellerRole) url += "&seller_role=" + encodeURIComponent(sellerRole);
    if (search) url += "&search=" + encodeURIComponent(search);

    marketCrops = await apiRequest(url);
    if (marketCrops.length === 0) {
      grid.innerHTML = '<p class="empty" style="grid-column:1/-1">No crops available right now.</p>';
      return;
    }
    grid.innerHTML = marketCrops.map((c) => cropCardHTML(c, buttonFor(c))).join("");
  } catch (error) {
    grid.innerHTML = `<p class="empty" style="grid-column:1/-1">${escapeHTML(error.message)}</p>`;
  }
}

// ============================================================
// HOME PAGE
// ============================================================
function setupHomePage() {
  const user = getUser();
  const box = document.getElementById("heroActions");
  if (getToken() && user) {
    box.innerHTML = `
      <a href="${ROLE_INFO[user.role].home}" class="btn btn-amber">Go to my ${ROLE_INFO[user.role].label} page</a>
      <a href="dashboard.html" class="btn btn-outline">Dashboard</a>`;
  } else {
    box.innerHTML = `
      <a href="register.html" class="btn btn-amber">Get started</a>
      <a href="buyer.html" class="btn btn-outline">Browse crops</a>`;
  }
}

// ============================================================
// LOGIN + REGISTER
// ============================================================
function setupLoginPage() {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("authMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("loginEmail").value,
          password: document.getElementById("loginPassword").value,
        }),
      });
      saveSession(data.access_token, data.user);
      window.location.href = ROLE_INFO[data.user.role].home;
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });
}

function setupRegisterPage() {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("authMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const role = document.querySelector('input[name="role"]:checked').value;
    try {
      const data = await apiRequest("/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("regName").value,
          email: document.getElementById("regEmail").value,
          password: document.getElementById("regPassword").value,
          role: role,
        }),
      });
      saveSession(data.access_token, data.user);
      window.location.href = ROLE_INFO[data.user.role].home;
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });
}

// ============================================================
// FARMER PAGE
// ============================================================
async function loadFarmerData() {
  const cropsBox = document.getElementById("farmerCrops");
  const ordersBox = document.getElementById("ordersList");
  try {
    myCropsCache = await apiRequest("/crops/mine");
    cropsBox.innerHTML = myCropsTableHTML(myCropsCache);
  } catch (error) {
    cropsBox.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
  try {
    const orders = await apiRequest("/orders?view=sales");
    ordersBox.innerHTML = ordersTableHTML(orders, "sales", true);
  } catch (error) {
    ordersBox.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

async function setupFarmerPage() {
  const user = await requireAuth(["farmer"]);
  if (!user) return;

  const form = document.getElementById("cropForm");
  const message = document.getElementById("cropMessage");
  const farmerInput = document.getElementById("farmerName");
  farmerInput.value = user.name;

  afterStatusChange = loadFarmerData;
  afterCropEdit = loadFarmerData;
  setupEditModal();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = {
      crop_name: document.getElementById("cropName").value,
      quantity: parseInt(document.getElementById("cropQuantity").value, 10),
      price: parseFloat(document.getElementById("cropPrice").value),
      farmer_name: farmerInput.value,
    };
    try {
      await apiRequest("/crops", { method: "POST", body: JSON.stringify(body) });
      toast("Crop added successfully! 🌱");
      message.className = "message";
      form.reset();
      farmerInput.value = user.name;
      loadFarmerData();
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });

  loadFarmerData();
}

// ============================================================
// VENDOR PAGE
// ============================================================
async function loadVendorStoreAndOrders() {
  const storeBox = document.getElementById("storeCrops");
  const salesBox = document.getElementById("salesList");
  const purchasesBox = document.getElementById("purchasesList");
  try {
    myCropsCache = await apiRequest("/crops/mine");
    storeBox.innerHTML = myCropsTableHTML(myCropsCache);
  } catch (error) {
    storeBox.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
  try {
    salesBox.innerHTML = ordersTableHTML(await apiRequest("/orders?view=sales"), "sales", true);
    purchasesBox.innerHTML = ordersTableHTML(await apiRequest("/orders?view=purchases"), "purchases", false);
  } catch (error) {
    salesBox.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

async function setupVendorPage() {
  const user = await requireAuth(["vendor"]);
  if (!user) return;

  setupTabs();
  setupBuyModal();
  setupEditModal();

  const search = document.getElementById("wholesaleSearch");
  const loadWholesale = () =>
    loadCropGrid(
      "wholesaleGrid",
      { sellerRole: "farmer", search: search.value.trim() },
      (c) => `<button class="btn" onclick="openBuyModal(${c.id})">📦 Buy Wholesale</button>`
    );

  afterPurchase = () => {
    loadWholesale();
    loadVendorStoreAndOrders();
  };
  afterStatusChange = loadVendorStoreAndOrders;
  afterCropEdit = loadVendorStoreAndOrders;

  let timer;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(loadWholesale, 300);
  });

  loadWholesale();
  loadVendorStoreAndOrders();
}

// ============================================================
// BUYER / MARKETPLACE PAGE (anyone can browse, buyers can buy)
// ============================================================
async function loadBuyerOrders() {
  const box = document.getElementById("myOrders");
  try {
    box.innerHTML = ordersTableHTML(await apiRequest("/orders?view=purchases"), "purchases", false);
  } catch (error) {
    box.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

function setupBuyerPage() {
  const user = getToken() ? getUser() : null;
  const search = document.getElementById("searchBox");
  const filter = document.getElementById("sellerFilter");

  // Decide what the button on each crop card should be
  const buttonFor = (c) => {
    if (!user) return '<a class="btn" href="login.html">🔐 Login to buy</a>';
    if (user.role === "buyer") return `<button class="btn" onclick="openBuyModal(${c.id})">🛒 Buy Now</button>`;
    if (user.role === "vendor") return '<a class="btn btn-secondary" href="vendor.html">Buy in Vendor Hub</a>';
    return '<button class="btn" disabled>Buyers only</button>';
  };

  const load = () =>
    loadCropGrid("cropGrid", { sellerRole: filter.value, search: search.value.trim() }, buttonFor);

  let timer;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(load, 300);
  });
  filter.addEventListener("change", load);

  if (user && user.role === "buyer") {
    setupBuyModal();
    afterPurchase = () => {
      load();
      loadBuyerOrders();
    };
    document.getElementById("myOrdersCard").style.display = "block";
    requireAuth(["buyer"]).then((me) => {
      if (me) loadBuyerOrders();
    });
  }

  load();
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
function statCard(icon, number, label, extraClass = "") {
  return `
    <div class="stat-card ${extraClass}">
      <div class="icon">${icon}</div>
      <div><div class="number">${number}</div><div class="label">${label}</div></div>
    </div>`;
}

async function setupDashboardPage() {
  const user = await requireAuth();
  if (!user) return;

  try {
    const d = await apiRequest("/dashboard");

    document.getElementById("totalCrops").textContent = formatNumber(d.total_crops);
    document.getElementById("totalOrders").textContent = formatNumber(d.total_orders);
    document.getElementById("totalStock").textContent = formatNumber(d.total_stock);

    let cards = "";
    if (d.role === "farmer" || d.role === "vendor") {
      cards += statCard("📋", formatNumber(d.my_listings), "My crop listings");
      cards += statCard("📦", formatNumber(d.my_stock) + " kg", "My stock");
      cards += statCard("🧾", formatNumber(d.orders_received), "Orders received");
      cards += statCard("💰", formatMoney(d.revenue), "Revenue");
      cards += statCard("⏳", formatNumber(d.pending_orders), "Pending orders", "amber");
    }
    if (d.role === "vendor") {
      cards += statCard("🚚", formatNumber(d.orders_placed), "Wholesale purchases");
      cards += statCard("💸", formatMoney(d.spent), "Spent on stock", "amber");
    }
    if (d.role === "buyer") {
      cards += statCard("🛍️", formatNumber(d.orders_placed), "Orders placed");
      cards += statCard("💸", formatMoney(d.spent), "Total spent", "amber");
    }
    document.getElementById("myStats").innerHTML = cards;

    document.getElementById("chartTitle").textContent =
      d.role === "buyer" ? "🏆 Crops I buy the most (kg)" : "🏆 My best-selling crops (kg)";

    const chart = document.getElementById("topCrops");
    if (d.top_crops.length === 0) {
      chart.innerHTML = '<p class="empty">No orders yet, so there is nothing to chart.</p>';
    } else {
      const max = Math.max(...d.top_crops.map((t) => t.quantity));
      chart.innerHTML = d.top_crops
        .map(
          (t) => `
          <div class="bar-row">
            <div class="bar-label">${cropEmoji(t.crop_name)} ${escapeHTML(t.crop_name)}</div>
            <div class="bar-track"><div class="bar-fill" data-width="${(t.quantity / max) * 100}"></div></div>
            <div class="bar-value">${formatNumber(t.quantity)} kg</div>
          </div>`
        )
        .join("");
      setTimeout(() => {
        document.querySelectorAll(".bar-fill").forEach((bar) => (bar.style.width = bar.dataset.width + "%"));
      }, 80);
    }
  } catch (error) {
    document.getElementById("dashError").textContent = error.message;
  }
}

// ============================================================
// Start the right code for the current page
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();

  switch (document.body.dataset.page) {
    case "home": setupHomePage(); break;
    case "login": setupLoginPage(); break;
    case "register": setupRegisterPage(); break;
    case "farmer": setupFarmerPage(); break;
    case "vendor": setupVendorPage(); break;
    case "buyer": setupBuyerPage(); break;
    case "dashboard": setupDashboardPage(); break;
  }
});
