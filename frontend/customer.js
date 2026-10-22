import { getApiBase, getHeaders, getUser, requireRole, clearAuth } from './auth.js';

const productGrid = document.getElementById('productGrid');
const cartCount = document.getElementById('cartCount');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutButton = document.getElementById('checkoutButton');
const logoutButton = document.getElementById('logoutButton');
const welcomeMessage = document.getElementById('welcomeMessage');
const cartPanel = document.getElementById('cartPanel');
const cartBackdrop = document.getElementById('cartBackdrop');
const closeCart = document.getElementById('closeCart');
const cartToggle = document.getElementById('cartToggle');

const cart = new Map();
let products = [];
const user = getUser();

function formatPrice(value) {
  return `$${value.toFixed(2)}`;
}

function updateCartCount() {
  const totalItems = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
}

function updateCartTotal() {
  const total = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity * item.price, 0);
  cartTotal.textContent = formatPrice(total);
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

async function fetchProducts() {
  const response = await fetch(`${getApiBase()}/api/products`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (result.success) {
    products = result.products;
    renderProducts();
  }
}

async function placeOrder() {
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

  const response = await fetch(`${getApiBase()}/api/order`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ customerId: user.id, items, total }),
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
  logoutButton.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'login.html';
  });
}

function initialize() {
  if (!requireRole('customer')) return;
  welcomeMessage.textContent = `Welcome, ${user.name}`;
  fetchProducts();
  bindEvents();
  updateCartCount();
  updateCartTotal();
  renderCart();
}

initialize();
