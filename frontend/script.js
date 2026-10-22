const productGrid = document.getElementById('productGrid');
const cartCount = document.getElementById('cartCount');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartPanel = document.getElementById('cartPanel');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartToggle = document.getElementById('cartToggle');
const closeCart = document.getElementById('closeCart');
const checkoutButton = document.getElementById('checkoutButton');
const contactForm = document.getElementById('contactForm');
const customerLoginForm = document.getElementById('customerLoginForm');
const adminLoginForm = document.getElementById('adminLoginForm');
const customerLoginButton = document.getElementById('customerLoginButton');
const adminLoginButton = document.getElementById('adminLoginButton');
const loginStatus = document.getElementById('loginStatus');
const adminSection = document.getElementById('adminSection');
const adminOrdersTableBody = document.querySelector('#adminOrdersTable tbody');

let products = [];
const cart = new Map();
let currentUser = null;
let authToken = null;
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE)
  || (window.location.port && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '');

function getHeaders(auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

function formatPrice(value) {
  return `$${value.toFixed(2)}`;
}

function updateLoginStatus() {
  if (!currentUser) {
    loginStatus.textContent = 'Not logged in.';
    adminSection.classList.add('hidden');
    return;
  }

  loginStatus.textContent = currentUser.role === 'admin'
    ? `Logged in as admin ${currentUser.name}`
    : `Logged in as customer ${currentUser.name}`;

  if (currentUser.role === 'admin') {
    adminSection.classList.remove('hidden');
    fetchAdminOrders();
  } else {
    adminSection.classList.add('hidden');
  }
}

function renderProducts() {
  productGrid.innerHTML = products
    .map((product) => `
      <article class="product-card">
        <span class="badge">${product.Tag}</span>
        <h3>${product.Name}</h3>
        <p>${product.Description}</p>
        <div class="price">${formatPrice(product.Price)}</div>
        <button class="btn btn-primary" data-id="${product.Id}">Add to cart</button>
      </article>
    `)
    .join('');
}

function updateCartCount() {
  const totalItems = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
}

function updateCartTotal() {
  const total = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity * item.price, 0);
  cartTotal.textContent = formatPrice(total);
}

function renderCart() {
  if (cart.size === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Your cart is empty. Add a product to place an order.</p>';
    return;
  }

  cartItems.innerHTML = Array.from(cart.values())
    .map((item) => `
      <div class="cart-item">
        <div class="cart-item-details">
          <strong>${item.name}</strong>
          <span>${formatPrice(item.price)} × ${item.quantity}</span>
        </div>
        <div class="cart-item-actions">
          <button data-action="increase" data-id="${item.id}">+</button>
          <button data-action="decrease" data-id="${item.id}">−</button>
        </div>
      </div>
    `)
    .join('');
}

function showCart() {
  cartPanel.classList.add('open');
  cartBackdrop.classList.add('open');
}

function hideCart() {
  cartPanel.classList.remove('open');
  cartBackdrop.classList.remove('open');
}

function addToCart(productId) {
  const product = products.find((item) => item.Id === productId);
  if (!product) return;

  if (cart.has(productId)) {
    cart.get(productId).quantity += 1;
  } else {
    cart.set(productId, { id: product.Id, name: product.Name, price: product.Price, quantity: 1 });
  }

  updateCartCount();
  updateCartTotal();
  renderCart();
  showCart();
}

function adjustItem(productId, action) {
  const item = cart.get(productId);
  if (!item) return;

  if (action === 'increase') {
    item.quantity += 1;
  } else if (action === 'decrease') {
    item.quantity -= 1;
  }

  if (item.quantity <= 0) {
    cart.delete(productId);
  }

  updateCartCount();
  updateCartTotal();
  renderCart();
}

async function login(role, email, password) {
  const response = await fetch(`${API_BASE}/api/login/${role}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();
  if (!result.success) {
    alert(result.error || 'Login failed.');
    return null;
  }

  authToken = result.token;
  return result.user;
}

async function fetchProducts() {
  const response = await fetch(`${API_BASE}/api/products`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (result.success) {
    products = result.products;
    renderProducts();
  }
}

async function fetchAdminOrders() {
  const response = await fetch(`${API_BASE}/api/admin/orders`, {
    headers: getHeaders(true),
  });
  const result = await response.json();
  if (result.success) {
    renderAdminOrders(result.orders);
  }
}

function renderAdminOrders(orders) {
  if (!orders.length) {
    adminOrdersTableBody.innerHTML = '<tr><td colspan="5">No orders found.</td></tr>';
    return;
  }

  adminOrdersTableBody.innerHTML = orders
    .map((order) => `
      <tr>
        <td>${order.id}</td>
        <td>${order.customerName}</td>
        <td>${formatPrice(order.total)}</td>
        <td>${order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</td>
        <td>${new Date(order.createdAt).toLocaleString()}</td>
      </tr>
    `)
    .join('');
}

async function placeOrder() {
  if (!currentUser || currentUser.role !== 'customer') {
    alert('You must login as a customer before checkout.');
    return;
  }

  if (cart.size === 0) {
    alert('Your cart is empty.');
    return;
  }

  const items = Array.from(cart.values()).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
  const total = Array.from(cart.values()).reduce((sum, item) => sum + item.price * item.quantity, 0);

  const response = await fetch(`${API_BASE}/api/order`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ customerId: currentUser.id, items, total }),
  });

  const result = await response.json();
  if (!result.success) {
    alert(result.error || 'Unable to place order.');
    return;
  }

  cart.clear();
  updateCartCount();
  updateCartTotal();
  renderCart();
  hideCart();
  alert(`Order placed successfully! Order ID: ${result.orderId}`);
}

function bindEvents() {
  productGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    addToCart(Number(button.dataset.id));
  });

  cartToggle.addEventListener('click', showCart);
  closeCart.addEventListener('click', hideCart);
  cartBackdrop.addEventListener('click', hideCart);

  cartItems.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    adjustItem(Number(button.dataset.id), button.dataset.action);
  });

  checkoutButton.addEventListener('click', placeOrder);

  customerLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('customerEmail').value.trim();
    const password = document.getElementById('customerPassword').value;
    const user = await login('customer', email, password);
    if (user) {
      currentUser = user;
      updateLoginStatus();
      document.getElementById('customerLoginForm').reset();
      alert('Customer login successful!');
    }
  });

  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const user = await login('admin', email, password);
    if (user) {
      currentUser = user;
      updateLoginStatus();
      document.getElementById('adminLoginForm').reset();
      alert('Admin login successful!');
    }
  });

  customerLoginButton.addEventListener('click', () => {
    document.getElementById('customerEmail').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  adminLoginButton.addEventListener('click', () => {
    document.getElementById('adminEmail').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alert('Thank you! We received your message and will contact you shortly.');
    contactForm.reset();
  });
}

fetchProducts();
bindEvents();
updateCartCount();
updateCartTotal();
renderCart();
updateLoginStatus();
