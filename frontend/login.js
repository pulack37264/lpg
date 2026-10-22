import { getApiBase, getHeaders, storeAuth, clearAuth } from './auth.js';

const customerLoginForm = document.getElementById('customerLoginForm');
const adminLoginForm = document.getElementById('adminLoginForm');
const statusMessage = document.getElementById('statusMessage');

clearAuth();

function showError(message) {
  statusMessage.textContent = message;
  statusMessage.classList.add('error');
}

async function login(role, email, password) {
  const response = await fetch(`${getApiBase()}/api/login/${role}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();
  if (!result.success) {
    showError(result.error || 'Login failed.');
    return null;
  }

  storeAuth(result.token, result.user);
  return result.user;
}

customerLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusMessage.textContent = '';
  const email = document.getElementById('customerEmail').value.trim();
  const password = document.getElementById('customerPassword').value;
  const user = await login('customer', email, password);
  if (user) {
    window.location.href = 'customer.html';
  }
});

adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusMessage.textContent = '';
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const user = await login('admin', email, password);
  if (user) {
    window.location.href = 'admin.html';
  }
});
