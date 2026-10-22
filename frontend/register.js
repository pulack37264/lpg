import { getApiBase, getHeaders, storeAuth } from './auth.js';

const registerForm = document.getElementById('registerForm');
const statusMessage = document.getElementById('statusMessage');

function showError(message) {
  statusMessage.textContent = message;
  statusMessage.classList.add('error');
}

function clearMessage() {
  statusMessage.textContent = '';
  statusMessage.classList.remove('error');
}

async function registerCustomer(data) {
  const response = await fetch(`${getApiBase()}/api/customers/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!result.success) {
    showError(result.error || 'Registration failed.');
    return null;
  }

  return result;
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const address = document.getElementById('address').value.trim();
  const phone = document.getElementById('phone').value.trim();

  const result = await registerCustomer({ name, email, password, address, phone });
  if (!result) return;

  storeAuth(result.token, result.user);
  window.location.href = 'customer.html';
});
