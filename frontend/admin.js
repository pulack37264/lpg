import { getApiBase, getHeaders, getUser, requireRole, clearAuth } from './auth.js';

const ordersTableBody = document.querySelector('#adminOrdersTable tbody');
const adminWelcome = document.getElementById('adminWelcome');
const logoutButton = document.getElementById('logoutButton');

function formatPrice(value) {
  return `$${value.toFixed(2)}`;
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="5">No orders found.</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = orders
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

async function fetchOrders() {
  const response = await fetch(`${getApiBase()}/api/admin/orders`, {
    headers: getHeaders(true),
  });
  const result = await response.json();
  if (result.success) {
    renderOrders(result.orders);
  } else {
    alert(result.error || 'Unable to load orders.');
    clearAuth();
    window.location.href = 'login.html';
  }
}

function bindEvents() {
  logoutButton.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'login.html';
  });
}

function initialize() {
  const user = getUser();
  if (!requireRole('admin')) return;
  adminWelcome.textContent = `Hello, ${user.name}`;
  bindEvents();
  fetchOrders();
}

initialize();
