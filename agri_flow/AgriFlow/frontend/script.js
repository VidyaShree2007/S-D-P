// ============================================================
// AgriFlow - shared JavaScript for all pages
// ============================================================

const API_URL = "http://127.0.0.1:8000";

// ---------- Helper functions ----------

// Talks to the backend and gives friendly errors
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(API_URL + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (error) {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
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

// Prevents users from injecting HTML into the page
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
  return "₹" + Number(amount).toFixed(2);
}

function formatDate(isoString) {
  // The server stores UTC time without a "Z", so we add it
  const hasZone = /Z|[+-]\d\d:\d\d$/.test(isoString);
  return new Date(hasZone ? isoString : isoString + "Z").toLocaleString();
}

// ============================================================
// FARMER PAGE
// ============================================================
async function loadFarmerCrops() {
  const box = document.getElementById("farmerCrops");
  try {
    const crops = await apiRequest("/crops");
    if (crops.length === 0) {
      box.innerHTML = '<p class="empty">No crops added yet.</p>';
      return;
    }
    let rows = "";
    crops.forEach((c) => {
      const status =
        c.quantity > 0
          ? '<span class="badge ok">In stock</span>'
          : '<span class="badge out">Sold out</span>';
      rows += `
        <tr>
          <td>${escapeHTML(c.crop_name)}</td>
          <td>${escapeHTML(c.farmer_name)}</td>
          <td>${c.quantity} kg</td>
          <td>${formatMoney(c.price)}/kg</td>
          <td>${status}</td>
        </tr>`;
    });
    box.innerHTML = `
      <table>
        <tr><th>Crop</th><th>Farmer</th><th>Stock</th><th>Price</th><th>Status</th></tr>
        ${rows}
      </table>`;
  } catch (error) {
    box.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

async function loadOrders() {
  const box = document.getElementById("ordersList");
  try {
    const orders = await apiRequest("/orders");
    if (orders.length === 0) {
      box.innerHTML = '<p class="empty">No orders yet.</p>';
      return;
    }
    let rows = "";
    orders.forEach((o) => {
      rows += `
        <tr>
          <td>#${o.id}</td>
          <td>${escapeHTML(o.crop_name)}</td>
          <td>${escapeHTML(o.farmer_name)}</td>
          <td>${escapeHTML(o.buyer_name)}</td>
          <td>${o.quantity} kg</td>
          <td>${formatMoney(o.total_price)}</td>
          <td>${formatDate(o.created_at)}</td>
        </tr>`;
    });
    box.innerHTML = `
      <table>
        <tr><th>Order</th><th>Crop</th><th>Farmer</th><th>Buyer</th><th>Qty</th><th>Total</th><th>Date</th></tr>
        ${rows}
      </table>`;
  } catch (error) {
    box.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

function setupFarmerPage() {
  const form = document.getElementById("cropForm");
  const message = document.getElementById("cropMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = {
      crop_name: document.getElementById("cropName").value,
      quantity: parseInt(document.getElementById("cropQuantity").value, 10),
      price: parseFloat(document.getElementById("cropPrice").value),
      farmer_name: document.getElementById("farmerName").value,
    };

    try {
      await apiRequest("/crops", { method: "POST", body: JSON.stringify(body) });
      showMessage(message, "Crop added successfully! 🌱", "success");
      form.reset();
      loadFarmerCrops();
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });

  loadFarmerCrops();
  loadOrders();
}

// ============================================================
// BUYER PAGE
// ============================================================
let availableCrops = []; // remembers crops shown on the page

async function loadBuyerCrops() {
  const grid = document.getElementById("cropGrid");
  try {
    // available_only=true -> sold-out crops are hidden from buyers
    availableCrops = await apiRequest("/crops?available_only=true");

    if (availableCrops.length === 0) {
      grid.innerHTML = '<p class="empty">No crops available right now.</p>';
      return;
    }

    grid.innerHTML = availableCrops
      .map(
        (c) => `
        <div class="crop-card">
          <h3>🌾 ${escapeHTML(c.crop_name)}</h3>
          <p>Farmer: ${escapeHTML(c.farmer_name)}</p>
          <p>Available: <strong>${c.quantity} kg</strong></p>
          <p class="price">${formatMoney(c.price)} / kg</p>
          <button class="btn" onclick="openBuyModal(${c.id})">Buy Now</button>
        </div>`
      )
      .join("");
  } catch (error) {
    grid.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

function openBuyModal(cropId) {
  const crop = availableCrops.find((c) => c.id === cropId);
  if (!crop) return;

  document.getElementById("orderCropId").value = crop.id;
  document.getElementById("modalTitle").textContent = "Buy " + crop.crop_name;
  document.getElementById("modalInfo").textContent =
    `${formatMoney(crop.price)}/kg • ${crop.quantity} kg available`;

  const qty = document.getElementById("orderQuantity");
  qty.max = crop.quantity;
  qty.value = "";

  document.getElementById("orderMessage").className = "message";
  document.getElementById("buyModal").classList.add("open");
}

function closeBuyModal() {
  document.getElementById("buyModal").classList.remove("open");
}

function setupBuyerPage() {
  const form = document.getElementById("orderForm");
  const message = document.getElementById("orderMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = {
      crop_id: parseInt(document.getElementById("orderCropId").value, 10),
      buyer_name: document.getElementById("buyerName").value,
      quantity: parseInt(document.getElementById("orderQuantity").value, 10),
    };

    try {
      const order = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });
      showMessage(
        message,
        `Order placed! Total: ${formatMoney(order.total_price)} ✅`,
        "success"
      );
      loadBuyerCrops(); // refresh: stock goes down, sold-out crops disappear
      setTimeout(closeBuyModal, 1500);
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });

  // Close the popup when clicking the dark background
  document.getElementById("buyModal").addEventListener("click", (event) => {
    if (event.target.id === "buyModal") closeBuyModal();
  });

  loadBuyerCrops();
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
async function loadDashboard() {
  try {
    const data = await apiRequest("/dashboard");
    document.getElementById("totalCrops").textContent = data.total_crops;
    document.getElementById("totalOrders").textContent = data.total_orders;
    document.getElementById("totalStock").textContent = data.total_stock;
  } catch (error) {
    document.getElementById("dashError").textContent = error.message;
  }
}

// ============================================================
// Start the right code for the current page
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cropForm")) setupFarmerPage();
  if (document.getElementById("cropGrid")) setupBuyerPage();
  if (document.getElementById("totalCrops")) loadDashboard();
});
